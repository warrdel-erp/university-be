'use strict';

/**
 * Destructive cleanup after curriculum_batch_term_mapping adoption.
 *
 * Clears examination operational data (schedules, seats, tickets, attendance,
 * invigilation, answer sheets, sessions) and assessment_plan_subject_mapping
 * so mappings / sessions can be recreated with CBTM.
 *
 * Does NOT truncate assessment_plan or exam_setup_type master/setup tables.
 */

const EXAMINATION_RELATED_TABLES = [
  // Leaf / dependent exam tables first (order only matters when FK checks are on)
  'exam_attendance',
  'exam_invigilator_assignment',
  'exam_room_material_item',
  'exam_room_material_bundle',
  'answer_sheet_annotation',
  'answersheet_evalution_user_assignment',
  'exam_session_answer_sheets',
  'student_exam_seat',
  'exam_schedule_room_capacity',
  'answer_sheet_qr',
  'question_paper',
  'teacher_exam_assignment',
  'exam_schedule',
  'student_hall_ticket',
  'student_result',
  'examination_session_eligibility',
  'examination_session_term',
  'examination_session_slot',
  'examination_session',
  // Assessment plan subject mappings (source of CBTM exam cohorts)
  'assessment_plan_subject_mapping',
];

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;', {
        transaction,
      });

      for (const tableName of EXAMINATION_RELATED_TABLES) {
        const description = await queryInterface
          .describeTable(tableName, { transaction })
          .catch(() => null);

        if (!description) {
          console.log(`Skipping missing table: ${tableName}`);
          continue;
        }

        await queryInterface.sequelize.query(`TRUNCATE TABLE \`${tableName}\`;`, {
          transaction,
        });
      }

      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;', {
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      try {
        await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;', {
          transaction,
        });
      } catch (restoreError) {
        console.error('Failed to restore FOREIGN_KEY_CHECKS:', restoreError);
      }
      await transaction.rollback();
      throw error;
    }
  },

  async down() {
    // Truncating tables is destructive and cannot be reverted.
  },
};
