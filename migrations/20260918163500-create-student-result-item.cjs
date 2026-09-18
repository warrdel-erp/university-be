'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'student_result_item',
        {
          student_result_item_id: {
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
          curriculum_subject_term_mapping_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'curriculum_subject_term_mapping',
              key: 'curriculum_subject_term_mapping_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          assessment_plan_component_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'assessment_plan_component',
              key: 'assessment_plan_component_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          maximum_marks: {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: false,
          },
          obtained_marks: {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: false,
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
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        'student_result_item',
        ['student_id', 'curriculum_subject_term_mapping_id', 'assessment_plan_component_id'],
        {
          unique: true,
          name: 'unique_student_cstm_ap_component',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'student_result_item',
        ['curriculum_subject_term_mapping_id'],
        {
          name: 'idx_student_result_item_cstm_id',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'student_result_item',
        ['student_id'],
        {
          name: 'idx_student_result_item_student_id',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'student_result_item',
        ['university_id', 'institute_id'],
        {
          name: 'idx_student_result_item_tenant',
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
      await queryInterface.dropTable('student_result_item', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
