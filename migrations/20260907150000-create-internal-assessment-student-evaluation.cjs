'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('internal_assessment_student_evaluation', {
      internal_assessment_student_evaluation_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
      internal_assessment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'internal_assessment',
          key: 'internal_assessment_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      obtained_marks: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
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
    });

    await queryInterface.addIndex(
      'internal_assessment_student_evaluation',
      ['student_id', 'internal_assessment_id'],
      {
        unique: true,
        name: 'unique_student_internal_assessment',
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('internal_assessment_student_evaluation');
  }
};
