'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (!tableInfo.is_moderation_enabled) {
      await queryInterface.addColumn('academic_regulation', 'is_moderation_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      });
    }

    if (!tableInfo.is_scaling_enabled) {
      await queryInterface.addColumn('academic_regulation', 'is_scaling_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      });
    }

    if (!tableInfo.is_normalization_enabled) {
      await queryInterface.addColumn('academic_regulation', 'is_normalization_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      });
    }

    if (!tableInfo.is_grace_marks_enabled) {
      await queryInterface.addColumn('academic_regulation', 'is_grace_marks_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      });
    }

    if (!tableInfo.maximum_grace_marks) {
      await queryInterface.addColumn('academic_regulation', 'maximum_grace_marks', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 5,
      });
    }

    if (!tableInfo.grace_applicable_to) {
      await queryInterface.addColumn('academic_regulation', 'grace_applicable_to', {
        type: Sequelize.ENUM('OVERALL', 'EXTERNAL', 'INTERNAL'),
        allowNull: true,
      });
    }

    if (!tableInfo.allow_withheld_result) {
      await queryInterface.addColumn('academic_regulation', 'allow_withheld_result', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      });
    }

    if (!tableInfo.result_freeze) {
      await queryInterface.addColumn('academic_regulation', 'result_freeze', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      });
    }

    if (!tableInfo.allow_result_revision) {
      await queryInterface.addColumn('academic_regulation', 'allow_result_revision', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      });
    }

    if (!tableInfo.publish_automatically) {
      await queryInterface.addColumn('academic_regulation', 'publish_automatically', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      });
    }

    if (!tableInfo.approval_required) {
      await queryInterface.addColumn('academic_regulation', 'approval_required', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (tableInfo.approval_required) await queryInterface.removeColumn('academic_regulation', 'approval_required');
    if (tableInfo.publish_automatically) await queryInterface.removeColumn('academic_regulation', 'publish_automatically');
    if (tableInfo.allow_result_revision) await queryInterface.removeColumn('academic_regulation', 'allow_result_revision');
    if (tableInfo.result_freeze) await queryInterface.removeColumn('academic_regulation', 'result_freeze');
    if (tableInfo.allow_withheld_result) await queryInterface.removeColumn('academic_regulation', 'allow_withheld_result');
    if (tableInfo.grace_applicable_to) await queryInterface.removeColumn('academic_regulation', 'grace_applicable_to');
    if (tableInfo.maximum_grace_marks) await queryInterface.removeColumn('academic_regulation', 'maximum_grace_marks');
    if (tableInfo.is_grace_marks_enabled) await queryInterface.removeColumn('academic_regulation', 'is_grace_marks_enabled');
    if (tableInfo.is_normalization_enabled) await queryInterface.removeColumn('academic_regulation', 'is_normalization_enabled');
    if (tableInfo.is_scaling_enabled) await queryInterface.removeColumn('academic_regulation', 'is_scaling_enabled');
    if (tableInfo.is_moderation_enabled) await queryInterface.removeColumn('academic_regulation', 'is_moderation_enabled');
  }
};
