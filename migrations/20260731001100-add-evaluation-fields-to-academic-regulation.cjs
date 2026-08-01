'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (!tableInfo.evaluation_pattern) {
      await queryInterface.addColumn('academic_regulation', 'evaluation_pattern', {
        type: Sequelize.ENUM('INTERNAL_EXTERNAL', 'INTERNAL_ONLY', 'EXTERNAL_ONLY'),
        allowNull: true,
      });
    }

    if (!tableInfo.internal_weightage) {
      await queryInterface.addColumn('academic_regulation', 'internal_weightage', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      });
    }

    if (!tableInfo.external_weightage) {
      await queryInterface.addColumn('academic_regulation', 'external_weightage', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      });
    }

    if (!tableInfo.maximum_internal_marks) {
      await queryInterface.addColumn('academic_regulation', 'maximum_internal_marks', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!tableInfo.maximum_external_marks) {
      await queryInterface.addColumn('academic_regulation', 'maximum_external_marks', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!tableInfo.is_internal_assessment_mandatory) {
      await queryInterface.addColumn('academic_regulation', 'is_internal_assessment_mandatory', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      });
    }

    if (!tableInfo.is_external_assessment_mandatory) {
      await queryInterface.addColumn('academic_regulation', 'is_external_assessment_mandatory', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (tableInfo.is_external_assessment_mandatory) await queryInterface.removeColumn('academic_regulation', 'is_external_assessment_mandatory');
    if (tableInfo.is_internal_assessment_mandatory) await queryInterface.removeColumn('academic_regulation', 'is_internal_assessment_mandatory');
    if (tableInfo.maximum_external_marks) await queryInterface.removeColumn('academic_regulation', 'maximum_external_marks');
    if (tableInfo.maximum_internal_marks) await queryInterface.removeColumn('academic_regulation', 'maximum_internal_marks');
    if (tableInfo.external_weightage) await queryInterface.removeColumn('academic_regulation', 'external_weightage');
    if (tableInfo.internal_weightage) await queryInterface.removeColumn('academic_regulation', 'internal_weightage');
    if (tableInfo.evaluation_pattern) await queryInterface.removeColumn('academic_regulation', 'evaluation_pattern');
  }
};
