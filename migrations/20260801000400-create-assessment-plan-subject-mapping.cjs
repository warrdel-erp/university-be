'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('assessment_plan_subject_mapping', {
      assessment_plan_subject_mapping_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      assessment_plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'assessment_plan',
          key: 'assessment_plan_id',
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
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'course',
          key: 'course_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'session',
          key: 'session_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('assessment_plan_subject_mapping', ['assessment_plan_id']);
    await queryInterface.addIndex('assessment_plan_subject_mapping', ['subject_id']);
    await queryInterface.addIndex('assessment_plan_subject_mapping', ['course_id']);
    await queryInterface.addIndex('assessment_plan_subject_mapping', ['session_id']);
    await queryInterface.addIndex('assessment_plan_subject_mapping', ['acedmic_year_id']);
    await queryInterface.addIndex('assessment_plan_subject_mapping', ['university_id']);
    await queryInterface.addIndex('assessment_plan_subject_mapping', ['institute_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('assessment_plan_subject_mapping');
  }
};
