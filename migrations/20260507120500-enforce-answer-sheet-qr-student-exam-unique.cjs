'use strict';

/**
 * Modifies answer_sheet_qr uniqueness constraint.
 *
 * Previous behavior:
 * - Only one row allowed per exam_schedule_id.
 *
 * Current behavior:
 * - One student can have only one answer sheet
 *   for a specific exam schedule.
 *
 * Unique combination:
 * (student_id, exam_schedule_id)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {

    // Remove duplicate rows before creating
    // composite unique constraint.
    //
    // Keeps the oldest row (smallest id)
    // for each student_id + exam_schedule_id pair.
    //
    // Note:
    // This query syntax is MySQL/MariaDB specific.

    await queryInterface.sequelize.query(`
      DELETE a1
      FROM answer_sheet_qr a1
      INNER JOIN answer_sheet_qr a2
        ON a1.student_id = a2.student_id
        AND a1.exam_schedule_id = a2.exam_schedule_id
        AND a1.id > a2.id
    `);

    // Remove previous unique constraint.
    //
    // Previous rule:
    // Only one row allowed per exam_schedule_id.

    try {
      await queryInterface.removeIndex(
        'answer_sheet_qr',
        'uq_answer_sheet_qr_exam_schedule_id'
      );
    } catch (e) {
      // Ignore if index does not exist.
    }

    // Create composite unique constraint.
    //
    // Current rule:
    // One student can have only one answer sheet
    // for a specific exam schedule.

    await queryInterface.addIndex(
      'answer_sheet_qr',
      ['student_id', 'exam_schedule_id'],
      {
        name: 'uq_answer_sheet_qr_student_exam',
        unique: true,
      }
    );
  },

  async down(queryInterface) {

    // Remove composite unique constraint.

    await queryInterface.removeIndex(
      'answer_sheet_qr',
      'uq_answer_sheet_qr_student_exam'
    );

    // Restore previous unique constraint.
    //
    // Previous rule:
    // Only one row allowed per exam_schedule_id.

    await queryInterface.addIndex(
      'answer_sheet_qr',
      ['exam_schedule_id'],
      {
        name: 'uq_answer_sheet_qr_exam_schedule_id',
        unique: true,
      }
    );
  },
};