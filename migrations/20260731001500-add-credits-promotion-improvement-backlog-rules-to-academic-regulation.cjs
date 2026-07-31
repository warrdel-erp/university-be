'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    // Credit Requirements
    if (!tableInfo.total_credits) await queryInterface.addColumn('academic_regulation', 'total_credits', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableInfo.core_credits) await queryInterface.addColumn('academic_regulation', 'core_credits', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableInfo.elective_credits) await queryInterface.addColumn('academic_regulation', 'elective_credits', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableInfo.open_elective_credits) await queryInterface.addColumn('academic_regulation', 'open_elective_credits', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableInfo.internship_credits) await queryInterface.addColumn('academic_regulation', 'internship_credits', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableInfo.project_credits) await queryInterface.addColumn('academic_regulation', 'project_credits', { type: Sequelize.INTEGER, allowNull: true });

    // Promotion Rules & ATKT
    if (!tableInfo.is_atkt_enabled) await queryInterface.addColumn('academic_regulation', 'is_atkt_enabled', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true });
    if (!tableInfo.maximum_atkt_subjects) await queryInterface.addColumn('academic_regulation', 'maximum_atkt_subjects', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableInfo.is_carry_forward_enabled) await queryInterface.addColumn('academic_regulation', 'is_carry_forward_enabled', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true });
    if (!tableInfo.maximum_carry_forward_subjects) await queryInterface.addColumn('academic_regulation', 'maximum_carry_forward_subjects', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableInfo.promotion_method) await queryInterface.addColumn('academic_regulation', 'promotion_method', { type: Sequelize.ENUM('YEAR_WISE', 'SEMESTER_WISE', 'TERM_WISE'), allowNull: true });

    // Improvement Rules
    if (!tableInfo.is_improvement_allowed) await queryInterface.addColumn('academic_regulation', 'is_improvement_allowed', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });
    if (!tableInfo.maximum_improvement_attempts) await queryInterface.addColumn('academic_regulation', 'maximum_improvement_attempts', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableInfo.improvement_marks_considered) await queryInterface.addColumn('academic_regulation', 'improvement_marks_considered', { type: Sequelize.ENUM('HIGHEST', 'LATEST'), allowNull: true });

    // Backlog & Supplementary Rules
    if (!tableInfo.is_backlog_allowed) await queryInterface.addColumn('academic_regulation', 'is_backlog_allowed', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true });
    if (!tableInfo.maximum_backlog_attempts) await queryInterface.addColumn('academic_regulation', 'maximum_backlog_attempts', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableInfo.is_supplementary_allowed) await queryInterface.addColumn('academic_regulation', 'is_supplementary_allowed', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true });
    if (!tableInfo.backlog_validity_years) await queryInterface.addColumn('academic_regulation', 'backlog_validity_years', { type: Sequelize.INTEGER, allowNull: true });
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (tableInfo.backlog_validity_years) await queryInterface.removeColumn('academic_regulation', 'backlog_validity_years');
    if (tableInfo.is_supplementary_allowed) await queryInterface.removeColumn('academic_regulation', 'is_supplementary_allowed');
    if (tableInfo.maximum_backlog_attempts) await queryInterface.removeColumn('academic_regulation', 'maximum_backlog_attempts');
    if (tableInfo.is_backlog_allowed) await queryInterface.removeColumn('academic_regulation', 'is_backlog_allowed');

    if (tableInfo.improvement_marks_considered) await queryInterface.removeColumn('academic_regulation', 'improvement_marks_considered');
    if (tableInfo.maximum_improvement_attempts) await queryInterface.removeColumn('academic_regulation', 'maximum_improvement_attempts');
    if (tableInfo.is_improvement_allowed) await queryInterface.removeColumn('academic_regulation', 'is_improvement_allowed');

    if (tableInfo.promotion_method) await queryInterface.removeColumn('academic_regulation', 'promotion_method');
    if (tableInfo.maximum_carry_forward_subjects) await queryInterface.removeColumn('academic_regulation', 'maximum_carry_forward_subjects');
    if (tableInfo.is_carry_forward_enabled) await queryInterface.removeColumn('academic_regulation', 'is_carry_forward_enabled');
    if (tableInfo.maximum_atkt_subjects) await queryInterface.removeColumn('academic_regulation', 'maximum_atkt_subjects');
    if (tableInfo.is_atkt_enabled) await queryInterface.removeColumn('academic_regulation', 'is_atkt_enabled');

    if (tableInfo.project_credits) await queryInterface.removeColumn('academic_regulation', 'project_credits');
    if (tableInfo.internship_credits) await queryInterface.removeColumn('academic_regulation', 'internship_credits');
    if (tableInfo.open_elective_credits) await queryInterface.removeColumn('academic_regulation', 'open_elective_credits');
    if (tableInfo.elective_credits) await queryInterface.removeColumn('academic_regulation', 'elective_credits');
    if (tableInfo.core_credits) await queryInterface.removeColumn('academic_regulation', 'core_credits');
    if (tableInfo.total_credits) await queryInterface.removeColumn('academic_regulation', 'total_credits');
  }
};
