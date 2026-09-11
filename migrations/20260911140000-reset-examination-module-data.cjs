"use strict";

/**
 * LOCAL / DEV ONLY — irreversible wipe of examination-module operational data.
 *
 * Clears assessment plans, examination sessions, schedules, seating, materials,
 * hall tickets, eligibility, answer sheets, results, and closely related tables.
 *
 * Does NOT delete master/reference tables such as exam_setup_type or exam_type
 * (sessions/plans can be recreated against existing setup types).
 *
 * down() is intentionally a no-op (data cannot be restored).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    // Leaf → parent order (also used when FK checks are on).
    const tables = [
      // Answer-sheet / evaluation leaves
      "answer_sheet_annotation",
      "pdf_split_jobs",
      "answer_sheet_qr",
      "answersheet_evalution_user_assignment",
      "exam_session_answer_sheets",

      // Attendance / seating / invigilation / materials
      "exam_attendance",
      "student_exam_seat",
      "exam_invigilator_assignment",
      "exam_room_material_item",
      "exam_room_material_bundle",

      // Schedule children
      "teacher_exam_assignment",
      "question_paper",
      "exam_schedule_room_capacity",
      "exam_schedule",

      // Session children
      "student_hall_ticket",
      "examination_session_eligibility",
      "student_result",
      "examination_session_term",
      "examination_session_slot",
      "examination_session",

      // Assessment plan tree
      "assessment_plan_subject_mapping",
      "assessment_plan_component",
      "assessment_plan",

      // Related exam evaluation / internal assessment
      "assessment_evalution",
      "internal_assessment_student_evaluation",
      "internal_assessment",

      // Question-paper blueprints used by schedules
      "question_paper_blueprint",

      // Deprecated exam mapper / setup term rows (optional clean)
      "exam_structure_schedule_mapper_depricated",
      "subject_weightage",
      "exam_setup_type_term_depricated",
      "exam_setup_depricated",
    ];

    const existing = new Set();
    const [rows] = await sequelize.query(
      `SELECT TABLE_NAME AS name
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()`,
    );
    for (const row of rows) {
      existing.add(row.name);
    }

    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

    try {
      for (const table of tables) {
        if (!existing.has(table)) continue;
        await sequelize.query(`TRUNCATE TABLE \`${table}\``);
      }
    } finally {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    }
  },

  async down() {
    // Irreversible data wipe — nothing to restore.
  },
};
