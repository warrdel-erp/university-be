'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Create student_historical_result
      await queryInterface.createTable(
        'student_historical_result',
        {
          student_historical_result_id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          student_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'students',
              key: 'student_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          curriculum_batch_term_mapping_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'curriculum_batch_term_mapping',
              key: 'curriculum_batch_term_mapping_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          total_credits: {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: true,
          },
          earned_credits: {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: true,
          },
          total_marks: {
            type: Sequelize.DECIMAL(8, 2),
            allowNull: true,
          },
          obtained_marks: {
            type: Sequelize.DECIMAL(8, 2),
            allowNull: true,
          },
          percentage: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
          },
          sgpa: {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: true,
          },
          cgpa: {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: true,
          },
          result_status: {
            type: Sequelize.ENUM('PASS', 'PROMOTED_WITH_ATKT', 'FAIL', 'WITHHELD'),
            allowNull: true,
            defaultValue: 'PASS',
          },
          freeze_status: {
            type: Sequelize.ENUM('DRAFT', 'VALIDATED', 'FROZEN', 'SUBMITTED'),
            allowNull: false,
            defaultValue: 'DRAFT',
          },
          is_frozen: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
          },
          frozen_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          university_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'university',
              key: 'university_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          institute_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'institute',
              key: 'institute_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          acedmic_year_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'acedmic_year',
              key: 'acedmic_year_id',
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
          },
          updated_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'user_id',
            },
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
        { transaction }
      );

      await queryInterface.addIndex(
        'student_historical_result',
        ['student_id', 'curriculum_batch_term_mapping_id'],
        {
          unique: true,
          name: 'unique_student_batch_term_historical',
          transaction,
        }
      );

      // 2. Create student_historical_subject_mark
      await queryInterface.createTable(
        'student_historical_subject_mark',
        {
          student_historical_subject_mark_id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          student_historical_result_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            references: {
              model: 'student_historical_result',
              key: 'student_historical_result_id',
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
          exam_setup_type_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'exam_setup_type',
              key: 'exam_setup_type_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          max_marks: {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: false,
          },
          obtained_marks: {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: false,
          },
          weightage_percentage: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
          },
          subject_total_marks: {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: true,
          },
          subject_max_marks: {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: true,
          },
          grade: {
            type: Sequelize.STRING(10),
            allowNull: true,
          },
          grade_point: {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: true,
          },
          credits: {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: true,
          },
          is_pass: {
            type: Sequelize.BOOLEAN,
            defaultValue: true,
          },
          university_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'university',
              key: 'university_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          institute_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'institute',
              key: 'institute_id',
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
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        'student_historical_subject_mark',
        ['student_historical_result_id', 'subject_id', 'exam_setup_type_id'],
        {
          unique: true,
          name: 'unique_historical_result_subject_exam_type',
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('student_historical_subject_mark', { transaction });
      await queryInterface.dropTable('student_historical_result', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
