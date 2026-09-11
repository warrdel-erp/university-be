"use strict";

/**
 * Add course_id and session_id to examination_session_term.
 * Unique key becomes (examination_session_id, course_id, session_id, term).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const description = await queryInterface.describeTable(
        "examination_session_term",
        { transaction },
      );

      if (!description.course_id) {
        await queryInterface.addColumn(
          "examination_session_term",
          "course_id",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "course",
              key: "course_id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          { transaction },
        );
      }

      if (!description.session_id) {
        await queryInterface.addColumn(
          "examination_session_term",
          "session_id",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "session",
              key: "session_id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          { transaction },
        );
      }

      const indexes = await queryInterface.showIndex(
        "examination_session_term",
        { transaction },
      );
      let hasOldUnique = false;
      let hasNewUnique = false;
      for (const index of indexes) {
        if (index.name === "unique_examination_session_term") {
          hasOldUnique = true;
        }
        if (index.name === "unique_examination_session_course_session_term") {
          hasNewUnique = true;
        }
      }

      if (hasOldUnique) {
        await queryInterface.removeIndex(
          "examination_session_term",
          "unique_examination_session_term",
          { transaction },
        );
      }

      if (!hasNewUnique) {
        await queryInterface.addIndex(
          "examination_session_term",
          ["examination_session_id", "course_id", "session_id", "term"],
          {
            unique: true,
            name: "unique_examination_session_course_session_term",
            transaction,
          },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const indexes = await queryInterface.showIndex(
        "examination_session_term",
        { transaction },
      );
      let hasNewUnique = false;
      let hasOldUnique = false;
      for (const index of indexes) {
        if (index.name === "unique_examination_session_course_session_term") {
          hasNewUnique = true;
        }
        if (index.name === "unique_examination_session_term") {
          hasOldUnique = true;
        }
      }

      if (hasNewUnique) {
        await queryInterface.removeIndex(
          "examination_session_term",
          "unique_examination_session_course_session_term",
          { transaction },
        );
      }

      if (!hasOldUnique) {
        await queryInterface.addIndex(
          "examination_session_term",
          ["examination_session_id", "term"],
          {
            unique: true,
            name: "unique_examination_session_term",
            transaction,
          },
        );
      }

      const description = await queryInterface.describeTable(
        "examination_session_term",
        { transaction },
      );

      if (description.session_id) {
        await queryInterface.removeColumn(
          "examination_session_term",
          "session_id",
          { transaction },
        );
      }

      if (description.course_id) {
        await queryInterface.removeColumn(
          "examination_session_term",
          "course_id",
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
