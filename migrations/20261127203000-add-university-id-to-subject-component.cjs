'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Add university_id column to subject_component (allowNull: true initially for backfill)
      await queryInterface.addColumn(
        'subject_component',
        'university_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'university',
            key: 'university_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        { transaction: t }
      );

      // 2. Dynamically determine primary university ID
      // Prefer university ID from existing subject_component_mapping if available, otherwise MIN(university_id)
      const [mappedUnivRows] = await queryInterface.sequelize.query(`
        SELECT s.university_id 
        FROM subject_component_mapping scm 
        JOIN subject s ON scm.subject_id = s.subject_id 
        WHERE s.university_id IS NOT NULL 
        LIMIT 1
      `, { transaction: t });

      let primaryUnivId = mappedUnivRows[0]?.university_id;
      if (!primaryUnivId) {
        const [firstUniv] = await queryInterface.sequelize.query(`
          SELECT MIN(university_id) as university_id FROM university
        `, { transaction: t });
        primaryUnivId = firstUniv[0]?.university_id || 1;
      }

      // Backfill existing unassigned records to primaryUnivId
      await queryInterface.sequelize.query(
        'UPDATE subject_component SET university_id = :primaryUnivId WHERE university_id IS NULL',
        { replacements: { primaryUnivId }, transaction: t }
      );

      // 3. Drop existing global unique constraint / index on `code`
      try {
        await queryInterface.removeConstraint('subject_component', 'code', { transaction: t });
      } catch {
        await queryInterface.removeIndex('subject_component', 'code', { transaction: t });
      }

      // 4. Seed standard components for all other active universities
      const defaultComponents = [
        {
          component_name: 'Theory',
          code: 'TH',
          description: 'Classroom-based theoretical instruction',
        },
        {
          component_name: 'Practical',
          code: 'PR',
          description: 'Practical coursework and laboratory application',
        },
        {
          component_name: 'Lab',
          code: 'LB',
          description: 'Laboratory experiments and technical coursework',
        },
        {
          component_name: 'Studio',
          code: 'ST',
          description: 'Studio-based design and drafting instruction',
        },
        {
          component_name: 'Workshop',
          code: 'WS',
          description: 'Hands-on workshop and technical training',
        },
        {
          component_name: 'Seminar',
          code: 'SM',
          description: 'Interactive seminars and presentations',
        },
        {
          component_name: 'Project',
          code: 'PJ',
          description: 'Capstone, dissertation or field project coursework',
        },
      ];

      // Fetch all universities except primaryUnivId
      const [universities] = await queryInterface.sequelize.query(
        'SELECT university_id FROM university WHERE university_id != :primaryUnivId',
        { replacements: { primaryUnivId }, transaction: t }
      );

      const toInsert = [];
      for (const univ of universities) {
        for (const comp of defaultComponents) {
          toInsert.push({
            university_id: univ.university_id,
            component_name: comp.component_name,
            code: comp.code,
            description: comp.description,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      if (toInsert.length > 0) {
        await queryInterface.bulkInsert('subject_component', toInsert, { transaction: t });
      }

      // 5. Change university_id column to NOT NULL
      await queryInterface.changeColumn(
        'subject_component',
        'university_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'university',
            key: 'university_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        { transaction: t }
      );

      // 6. Add composite unique constraint on (university_id, code)
      await queryInterface.addConstraint('subject_component', {
        fields: ['university_id', 'code'],
        type: 'unique',
        name: 'unique_university_subject_component_code',
        transaction: t,
      });
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeConstraint('subject_component', 'unique_university_subject_component_code', { transaction: t });
      await queryInterface.removeColumn('subject_component', 'university_id', { transaction: t });
      await queryInterface.addConstraint('subject_component', {
        fields: ['code'],
        type: 'unique',
        name: 'code',
        transaction: t,
      });
    });
  },
};
