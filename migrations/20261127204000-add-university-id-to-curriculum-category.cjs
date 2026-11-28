'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Add university_id column to curriculum_category (allowNull: true initially for backfill)
      await queryInterface.addColumn(
        'curriculum_category',
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
      // Prefer university ID from existing curriculum_subject_term_mapping if available, otherwise MIN(university_id)
      const [mappedUnivRows] = await queryInterface.sequelize.query(`
        SELECT s.university_id 
        FROM curriculum_subject_term_mapping cstm 
        JOIN subject s ON cstm.subject_id = s.subject_id 
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
        'UPDATE curriculum_category SET university_id = :primaryUnivId WHERE university_id IS NULL',
        { replacements: { primaryUnivId }, transaction: t }
      );

      // 3. Drop existing global unique constraint / index on `code`
      try {
        await queryInterface.removeConstraint('curriculum_category', 'code', { transaction: t });
      } catch {
        await queryInterface.removeIndex('curriculum_category', 'code', { transaction: t });
      }

      // 4. Seed standard categories for all other active universities
      const defaultCategories = [
        {
          category_name: 'Core Coursework',
          code: 'CC',
          is_elective_coursework: false,
          description: 'Compulsory core coursework curriculum courses',
        },
        {
          category_name: 'Professional Elective',
          code: 'PE',
          is_elective_coursework: true,
          description: 'Discipline-specific professional elective coursework',
        },
        {
          category_name: 'Open Elective',
          code: 'OE',
          is_elective_coursework: true,
          description: 'Interdisciplinary open elective coursework',
        },
      ];

      // Fetch all universities except primaryUnivId
      const [universities] = await queryInterface.sequelize.query(
        'SELECT university_id FROM university WHERE university_id != :primaryUnivId',
        { replacements: { primaryUnivId }, transaction: t }
      );

      const toInsert = [];
      for (const univ of universities) {
        for (const cat of defaultCategories) {
          toInsert.push({
            university_id: univ.university_id,
            category_name: cat.category_name,
            code: cat.code,
            is_elective_coursework: cat.is_elective_coursework,
            description: cat.description,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      if (toInsert.length > 0) {
        await queryInterface.bulkInsert('curriculum_category', toInsert, { transaction: t });
      }

      // 5. Change university_id column to NOT NULL
      await queryInterface.changeColumn(
        'curriculum_category',
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
      await queryInterface.addConstraint('curriculum_category', {
        fields: ['university_id', 'code'],
        type: 'unique',
        name: 'unique_university_curriculum_category_code',
        transaction: t,
      });
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeConstraint('curriculum_category', 'unique_university_curriculum_category_code', { transaction: t });
      await queryInterface.removeColumn('curriculum_category', 'university_id', { transaction: t });
      await queryInterface.addConstraint('curriculum_category', {
        fields: ['code'],
        type: 'unique',
        name: 'code',
        transaction: t,
      });
    });
  },
};
