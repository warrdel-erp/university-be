"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Add effect column if it doesn't already exist
      const [columns] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM `fee_policy_students`;",
        { transaction }
      );
      const columnNames = new Set(columns.map((c) => c.Field));

      if (!columnNames.has("effect")) {
        await queryInterface.addColumn(
          "fee_policy_students",
          "effect",
          {
            type: Sequelize.ENUM("reduce_fee", "add_charge", "refund"),
            allowNull: false,
            defaultValue: "reduce_fee",
          },
          { transaction }
        );
      }

      // 2. Drop old unique index on [fee_policy_id, student_id]
      // In MySQL, fee_policy_id foreign key constraint may bind to uq_fee_policy_student,
      // so we safely drop FK, drop index, and recreate FK.
      const [existingIndexes] = await queryInterface.sequelize.query(
        "SHOW INDEX FROM `fee_policy_students`;",
        { transaction }
      );
      const indexNames = new Set(existingIndexes.map((idx) => idx.Key_name));

      if (indexNames.has("uq_fee_policy_student")) {
        try {
          const [fks] = await queryInterface.sequelize.query(
            `SELECT CONSTRAINT_NAME 
             FROM information_schema.KEY_COLUMN_USAGE 
             WHERE TABLE_NAME = 'fee_policy_students' 
               AND COLUMN_NAME = 'fee_policy_id' 
               AND REFERENCED_TABLE_NAME IS NOT NULL;`,
            { transaction }
          );

          for (const fk of fks) {
            try {
              await queryInterface.sequelize.query(
                `ALTER TABLE \`fee_policy_students\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\`;`,
                { transaction }
              );
            } catch (fkErr) {
              console.warn("FK drop warning:", fkErr.message);
            }
          }

          await queryInterface.sequelize.query(
            "ALTER TABLE `fee_policy_students` DROP INDEX `uq_fee_policy_student`;",
            { transaction }
          );

          await queryInterface.sequelize.query(
            `ALTER TABLE \`fee_policy_students\` 
             ADD CONSTRAINT \`fee_policy_students_fk_fee_policy\` 
             FOREIGN KEY (\`fee_policy_id\`) REFERENCES \`fee_policy\` (\`fee_policy_id\`) 
             ON DELETE CASCADE ON UPDATE CASCADE;`,
            { transaction }
          );
        } catch (err) {
          console.warn("Index uq_fee_policy_student removal skipped:", err.message);
        }
      }

      // 3. Add composite unique index on [fee_policy_id, student_id, effect]
      const [recheckedIndexes] = await queryInterface.sequelize.query(
        "SHOW INDEX FROM `fee_policy_students`;",
        { transaction }
      );
      const recheckedIndexNames = new Set(recheckedIndexes.map((idx) => idx.Key_name));

      if (!recheckedIndexNames.has("uq_fee_policy_student_effect")) {
        try {
          await queryInterface.addIndex(
            "fee_policy_students",
            ["fee_policy_id", "student_id", "effect"],
            {
              unique: true,
              name: "uq_fee_policy_student_effect",
              transaction,
            }
          );
        } catch (err) {
          if (!err.message?.includes("Duplicate key name")) {
            throw err;
          }
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Drop composite unique index
      const [existingIndexes] = await queryInterface.sequelize.query(
        "SHOW INDEX FROM `fee_policy_students`;",
        { transaction }
      );
      const indexNames = new Set(existingIndexes.map((idx) => idx.Key_name));

      if (indexNames.has("uq_fee_policy_student_effect")) {
        try {
          await queryInterface.removeIndex(
            "fee_policy_students",
            "uq_fee_policy_student_effect",
            { transaction }
          );
        } catch (err) {
          console.warn("Index uq_fee_policy_student_effect removal skipped:", err.message);
        }
      }

      // 2. Remove effect column
      const [columns] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM `fee_policy_students`;",
        { transaction }
      );
      const columnNames = new Set(columns.map((c) => c.Field));
      if (columnNames.has("effect")) {
        await queryInterface.removeColumn("fee_policy_students", "effect", { transaction });
      }

      // 3. Re-add old unique index on [fee_policy_id, student_id]
      try {
        await queryInterface.addIndex(
          "fee_policy_students",
          ["fee_policy_id", "student_id"],
          {
            unique: true,
            name: "uq_fee_policy_student",
            transaction,
          }
        );
      } catch (err) {
        if (!err.message?.includes("Duplicate key name")) {
          throw err;
        }
      }
    });
  },
};
