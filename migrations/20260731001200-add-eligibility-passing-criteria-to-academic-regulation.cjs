'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (!tableInfo.minimum_attendance) {
      await queryInterface.addColumn('academic_regulation', 'minimum_attendance', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      });
    }

    if (!tableInfo.is_assessment_completion_required) {
      await queryInterface.addColumn('academic_regulation', 'is_assessment_completion_required', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      });
    }

    if (!tableInfo.is_practical_completion_required) {
      await queryInterface.addColumn('academic_regulation', 'is_practical_completion_required', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      });
    }

    if (!tableInfo.is_project_submission_required) {
      await queryInterface.addColumn('academic_regulation', 'is_project_submission_required', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      });
    }

    if (!tableInfo.is_internship_completion_required) {
      await queryInterface.addColumn('academic_regulation', 'is_internship_completion_required', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      });
    }

    if (!tableInfo.minimum_overall_marks) {
      await queryInterface.addColumn('academic_regulation', 'minimum_overall_marks', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!tableInfo.minimum_overall_percentage) {
      await queryInterface.addColumn('academic_regulation', 'minimum_overall_percentage', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      });
    }

    if (!tableInfo.minimum_internal_marks) {
      await queryInterface.addColumn('academic_regulation', 'minimum_internal_marks', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!tableInfo.minimum_external_marks) {
      await queryInterface.addColumn('academic_regulation', 'minimum_external_marks', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!tableInfo.mandatory_components) {
      await queryInterface.addColumn('academic_regulation', 'mandatory_components', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (tableInfo.mandatory_components) await queryInterface.removeColumn('academic_regulation', 'mandatory_components');
    if (tableInfo.minimum_external_marks) await queryInterface.removeColumn('academic_regulation', 'minimum_external_marks');
    if (tableInfo.minimum_internal_marks) await queryInterface.removeColumn('academic_regulation', 'minimum_internal_marks');
    if (tableInfo.minimum_overall_percentage) await queryInterface.removeColumn('academic_regulation', 'minimum_overall_percentage');
    if (tableInfo.minimum_overall_marks) await queryInterface.removeColumn('academic_regulation', 'minimum_overall_marks');
    if (tableInfo.is_internship_completion_required) await queryInterface.removeColumn('academic_regulation', 'is_internship_completion_required');
    if (tableInfo.is_project_submission_required) await queryInterface.removeColumn('academic_regulation', 'is_project_submission_required');
    if (tableInfo.is_practical_completion_required) await queryInterface.removeColumn('academic_regulation', 'is_practical_completion_required');
    if (tableInfo.is_assessment_completion_required) await queryInterface.removeColumn('academic_regulation', 'is_assessment_completion_required');
    if (tableInfo.minimum_attendance) await queryInterface.removeColumn('academic_regulation', 'minimum_attendance');
  }
};
