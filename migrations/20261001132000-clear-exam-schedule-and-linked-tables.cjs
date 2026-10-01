"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Disable foreign key checks for clean truncation across tables
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0;", {
        transaction,
      });

      // 2. Tables to truncate from examination_session down to student_result and all linked tables
      const tablesToTruncate = [
        // Student Results & items
        "student_result_item",
        "student_result",

        // Answer sheets, annotations, evaluations & split jobs
        "answer_sheet_annotation",
        "answer_sheet_qr",
        "answersheet_evalution_user_assignment",
        "pdf_split_jobs",
        "exam_session_answer_sheets",

        // Exam attendance, seating & room materials
        "exam_attendance",
        "student_exam_seat",
        "exam_schedule_room_capacity",
        "exam_invigilator_assignment",
        "exam_room_material_item",
        "exam_room_material_bundle",

        // Papers, teacher assignments & exam schedules
        "question_paper",
        "teacher_exam_assignment",
        "exam_schedule",

        // Hall tickets, eligibility & session terms/slots
        "student_hall_ticket",
        "examination_session_eligibility",
        "examination_session_slot",
        "examination_session_term",

        // Examination Session root table
        "examination_session",
      ];

      for (const table of tablesToTruncate) {
        try {
          await queryInterface.sequelize.query(`TRUNCATE TABLE \`${table}\`;`, {
            transaction,
          });
          console.log(`Truncated table: ${table}`);
        } catch (err) {
          console.log(
            `Notice: Could not truncate ${table} (may not exist or already empty):`,
            err.message,
          );
        }
      }

      // 3. Re-enable foreign key checks
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1;", {
        transaction,
      });

      await transaction.commit();
      console.log(
        "Successfully emptied examination_session to student_result and all linked tables.",
      );
    } catch (error) {
      try {
        await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1;", {
          transaction,
        });
      } catch (err) {
        console.error("Failed to restore FOREIGN_KEY_CHECKS:", err);
      }
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Truncating tables is a destructive operation that cannot be reverted
  },
};
