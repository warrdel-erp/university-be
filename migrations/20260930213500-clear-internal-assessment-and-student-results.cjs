"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Temporarily disable foreign key constraints for clean truncation
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0;", {
        transaction,
      });

      // 2. Tables to truncate
      const tablesToTruncate = [
        // Internal assessment tables
        "assessment_plan_subject_mapping",
        "internal_assessment_student_evaluation",
        "internal_assessment",
        "assessment_evalution",

        // Student result tables
        "student_result_item",
        "student_result",

        // Examination session tables
        "examination_session_slot",
        "examination_session_term",
        "examination_session",
      ];

      for (const table of tablesToTruncate) {
        try {
          await queryInterface.sequelize.query(`TRUNCATE TABLE ${table};`, {
            transaction,
          });
          console.log(`Truncated ${table}`);
        } catch (err) {
          console.log(`Could not truncate ${table}:`, err.message);
        }
      }

      // 3. Re-enable foreign key constraints
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1;", {
        transaction,
      });

      await transaction.commit();
      console.log(
        "Successfully cleared internal assessment and student result tables",
      );
    } catch (error) {
      try {
        await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1;", {
          transaction,
        });
      } catch (e) {
        console.error("Failed to reset foreign key checks:", e.message);
      }
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Truncating data is a destructive operation that cannot be reverted
  },
};
