'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const rawTables = await queryInterface.showAllTables({ transaction: t });
      const tables = rawTables.map((tbl) =>
        typeof tbl === 'string' ? tbl : tbl.tableName || tbl.name || String(tbl),
      );

      if (!tables.includes('subject_zscore_calculation')) {
        await queryInterface.createTable(
          'subject_zscore_calculation',
          {
            id: {
              type: Sequelize.BIGINT,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            examination_session_id: {
              type: Sequelize.BIGINT,
              allowNull: false,
              references: {
                model: 'examination_session',
                key: 'examination_session_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
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
            exam_schedule_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'exam_schedule',
                key: 'exam_schedule_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            teacher_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'users',
                key: 'user_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            calculation_type: {
              type: Sequelize.STRING(20),
              allowNull: false,
              comment: 'SUBJECT or TEACHER',
            },
            evaluated_students_count: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 0,
            },
            class_mean: {
              type: Sequelize.DECIMAL(6, 2),
              allowNull: true,
            },
            standard_dev: {
              type: Sequelize.DECIMAL(6, 4),
              allowNull: true,
            },
            grading_id: {
              type: Sequelize.BIGINT,
              allowNull: true,
              references: {
                model: 'grading',
                key: 'grading_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            created_by: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'users',
                key: 'user_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            university_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'university',
                key: 'university_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            institute_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'institute',
                key: 'institute_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            created_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
          },
          { transaction: t },
        );

        await queryInterface.addIndex(
          'subject_zscore_calculation',
          ['examination_session_id', 'subject_id', 'teacher_id'],
          {
            name: 'idx_session_subject_teacher_zscore',
            transaction: t,
          },
        );

        await queryInterface.addIndex(
          'subject_zscore_calculation',
          ['examination_session_id', 'subject_id', 'calculation_type'],
          {
            name: 'idx_session_subject_type_zscore',
            transaction: t,
          },
        );
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const rawTables = await queryInterface.showAllTables({ transaction: t });
      const tables = rawTables.map((tbl) =>
        typeof tbl === 'string' ? tbl : tbl.tableName || tbl.name || String(tbl),
      );

      if (tables.includes('subject_zscore_calculation')) {
        await queryInterface.dropTable('subject_zscore_calculation', { transaction: t });
      }
    });
  },
};
