"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const [columns] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM `fee_policy`;",
        { transaction }
      );
      const columnNames = new Set(columns.map((c) => c.Field));

      if (!columnNames.has("is_student_mapped")) {
        await queryInterface.addColumn(
          "fee_policy",
          "is_student_mapped",
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction }
        );
      }

      // Backfill based on existing mappings in fee_policy_students
      await queryInterface.sequelize.query(
        `UPDATE \`fee_policy\` fp
         SET fp.\`is_student_mapped\` = EXISTS (
           SELECT 1 FROM \`fee_policy_students\` fps WHERE fps.\`fee_policy_id\` = fp.\`fee_policy_id\`
         );`,
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const [columns] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM `fee_policy`;",
        { transaction }
      );
      const columnNames = new Set(columns.map((c) => c.Field));

      if (columnNames.has("is_student_mapped")) {
        await queryInterface.removeColumn(
          "fee_policy",
          "is_student_mapped",
          { transaction }
        );
      }
    });
  },
};
