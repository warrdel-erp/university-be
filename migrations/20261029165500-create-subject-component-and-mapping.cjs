'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Create subject_component table
      await queryInterface.createTable(
        'subject_component',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          component_name: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },
          code: {
            type: Sequelize.STRING(20),
            allowNull: false,
            unique: true,
          },
          description: {
            type: Sequelize.STRING(250),
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
          },
        },
        { transaction: t }
      );

      // 2. Seed initial components extracted from subject_category and UI screenshot
      const initialComponents = [
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

      for (const comp of initialComponents) {
        await queryInterface.bulkInsert(
          'subject_component',
          [
            {
              component_name: comp.component_name,
              code: comp.code,
              description: comp.description,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          { transaction: t }
        );
      }

      // 3. Create subject_component_mapping table
      await queryInterface.createTable(
        'subject_component_mapping',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          subject_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'subject',
              key: 'subject_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          subject_component_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'subject_component',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
          },
        },
        { transaction: t }
      );

      // Add unique constraint on (subject_id, subject_component_id)
      await queryInterface.addConstraint('subject_component_mapping', {
        fields: ['subject_id', 'subject_component_id'],
        type: 'unique',
        name: 'unique_subject_component_mapping',
        transaction: t,
      });

      // 4. Backfill mappings from existing subject.subject_category
      // Fetch all created components to get their IDs
      const [components] = await queryInterface.sequelize.query(
        'SELECT id, component_name FROM subject_component',
        { transaction: t }
      );

      const componentMap = {};
      for (const c of components) {
        componentMap[c.component_name.toLowerCase()] = c.id;
      }

      // Fetch all subjects having non-null subject_category
      const [subjects] = await queryInterface.sequelize.query(
        'SELECT subject_id, subject_category FROM subject WHERE subject_category IS NOT NULL AND TRIM(subject_category) != ""',
        { transaction: t }
      );

      const mappingsToInsert = [];
      const seen = new Set();

      for (const sub of subjects) {
        const catName = sub.subject_category ? sub.subject_category.trim().toLowerCase() : null;
        if (catName && componentMap[catName]) {
          const compId = componentMap[catName];
          const key = `${sub.subject_id}_${compId}`;
          if (!seen.has(key)) {
            seen.add(key);
            mappingsToInsert.push({
              subject_id: sub.subject_id,
              subject_component_id: compId,
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
        }
      }

      if (mappingsToInsert.length > 0) {
        await queryInterface.bulkInsert('subject_component_mapping', mappingsToInsert, {
          transaction: t,
        });
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.dropTable('subject_component_mapping', { transaction: t });
      await queryInterface.dropTable('subject_component', { transaction: t });
    });
  },
};

