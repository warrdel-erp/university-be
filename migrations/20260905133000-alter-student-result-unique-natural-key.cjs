"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const indexes = await queryInterface.showIndex("student_result", {
        transaction,
      });

      let hasOldSessionStudentIndex = false;
      let hasUniqueNaturalKey = false;

      for (const index of indexes) {
        if (index.name === "idx_student_result_session_student") {
          hasOldSessionStudentIndex = true;
        }
        if (
          index.name === "uq_student_result_session_student_course_session_term"
        ) {
          hasUniqueNaturalKey = true;
        }
      }

      // Add unique index first — MySQL needs an index on examination_session_id
      // for its FK; the unique key starts with that column, so it can replace
      // idx_student_result_session_student before the old index is dropped.
      if (!hasUniqueNaturalKey) {
        await queryInterface.addIndex(
          "student_result",
          [
            "examination_session_id",
            "student_id",
            "course_id",
            "session_id",
            "term",
          ],
          {
            name: "uq_student_result_session_student_course_session_term",
            unique: true,
            transaction,
          },
        );
      }

      if (hasOldSessionStudentIndex) {
        await queryInterface.removeIndex(
          "student_result",
          "idx_student_result_session_student",
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const indexes = await queryInterface.showIndex("student_result", {
        transaction,
      });

      let hasUniqueNaturalKey = false;
      let hasOldSessionStudentIndex = false;

      for (const index of indexes) {
        if (
          index.name === "uq_student_result_session_student_course_session_term"
        ) {
          hasUniqueNaturalKey = true;
        }
        if (index.name === "idx_student_result_session_student") {
          hasOldSessionStudentIndex = true;
        }
      }

      if (!hasOldSessionStudentIndex) {
        await queryInterface.addIndex(
          "student_result",
          ["examination_session_id", "student_id"],
          {
            name: "idx_student_result_session_student",
            transaction,
          },
        );
      }

      if (hasUniqueNaturalKey) {
        await queryInterface.removeIndex(
          "student_result",
          "uq_student_result_session_student_course_session_term",
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
