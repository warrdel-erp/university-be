'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (!tableInfo.total_credits_required) await queryInterface.addColumn('academic_regulation', 'total_credits_required', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableInfo.minimum_cgpa) await queryInterface.addColumn('academic_regulation', 'minimum_cgpa', { type: Sequelize.DECIMAL(3, 2), allowNull: true });
    if (!tableInfo.is_internship_mandatory) await queryInterface.addColumn('academic_regulation', 'is_internship_mandatory', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });
    if (!tableInfo.is_project_mandatory) await queryInterface.addColumn('academic_regulation', 'is_project_mandatory', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });
    if (!tableInfo.is_capstone_mandatory) await queryInterface.addColumn('academic_regulation', 'is_capstone_mandatory', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });
    if (!tableInfo.is_exit_examination_required) await queryInterface.addColumn('academic_regulation', 'is_exit_examination_required', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });

    if (!tableInfo.is_no_active_backlogs_required) await queryInterface.addColumn('academic_regulation', 'is_no_active_backlogs_required', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true });
    if (!tableInfo.is_no_pending_fees_required) await queryInterface.addColumn('academic_regulation', 'is_no_pending_fees_required', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true });
    if (!tableInfo.is_no_disciplinary_hold_required) await queryInterface.addColumn('academic_regulation', 'is_no_disciplinary_hold_required', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true });
    if (!tableInfo.minimum_degree_attendance_percentage) await queryInterface.addColumn('academic_regulation', 'minimum_degree_attendance_percentage', { type: Sequelize.DECIMAL(5, 2), allowNull: true });
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (tableInfo.minimum_degree_attendance_percentage) await queryInterface.removeColumn('academic_regulation', 'minimum_degree_attendance_percentage');
    if (tableInfo.is_no_disciplinary_hold_required) await queryInterface.removeColumn('academic_regulation', 'is_no_disciplinary_hold_required');
    if (tableInfo.is_no_pending_fees_required) await queryInterface.removeColumn('academic_regulation', 'is_no_pending_fees_required');
    if (tableInfo.is_no_active_backlogs_required) await queryInterface.removeColumn('academic_regulation', 'is_no_active_backlogs_required');

    if (tableInfo.is_exit_examination_required) await queryInterface.removeColumn('academic_regulation', 'is_exit_examination_required');
    if (tableInfo.is_capstone_mandatory) await queryInterface.removeColumn('academic_regulation', 'is_capstone_mandatory');
    if (tableInfo.is_project_mandatory) await queryInterface.removeColumn('academic_regulation', 'is_project_mandatory');
    if (tableInfo.is_internship_mandatory) await queryInterface.removeColumn('academic_regulation', 'is_internship_mandatory');
    if (tableInfo.minimum_cgpa) await queryInterface.removeColumn('academic_regulation', 'minimum_cgpa');
    if (tableInfo.total_credits_required) await queryInterface.removeColumn('academic_regulation', 'total_credits_required');
  }
};
