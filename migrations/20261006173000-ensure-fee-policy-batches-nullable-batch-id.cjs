"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const rawTables = await queryInterface.showAllTables({ transaction });
      const tables = rawTables.map((t) =>
        typeof t === "string" ? t : t.tableName || t.name || String(t)
      );

      // If fee_policy_batches does not exist at all, create it fresh
      if (!tables.includes("fee_policy_batches")) {
        await queryInterface.createTable(
          "fee_policy_batches",
          {
            fee_policy_batch_id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            fee_policy_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: "fee_policy",
                key: "fee_policy_id",
              },
              onDelete: "CASCADE",
              onUpdate: "CASCADE",
            },
            batch_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: "batch",
                key: "batch_id",
              },
              onDelete: "CASCADE",
              onUpdate: "CASCADE",
            },
            course_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: "course",
                key: "course_id",
              },
              onDelete: "CASCADE",
              onUpdate: "CASCADE",
            },
            year: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: null,
            },
            term: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: null,
            },
            university_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            institute_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            created_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
            updated_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal(
                "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
              ),
            },
          },
          { transaction }
        );

        await queryInterface.addIndex(
          "fee_policy_batches",
          ["fee_policy_id", "course_id", "year", "term"],
          {
            name: "idx_fee_policy_course_year_term",
            transaction,
          }
        );

        return;
      }

      // If table exists, inspect its schema
      const tableDesc = await queryInterface.describeTable(
        "fee_policy_batches",
        { transaction }
      );

      // 1. Ensure batch_id is NULLABLE
      try {
        await queryInterface.sequelize.query(
          "SET FOREIGN_KEY_CHECKS = 0;",
          { transaction }
        );
        await queryInterface.sequelize.query(
          "ALTER TABLE `fee_policy_batches` MODIFY COLUMN `batch_id` INT NULL;",
          { transaction }
        );
      } catch (err) {
        console.warn("Raw ALTER TABLE batch_id NULL failed, attempting changeColumn:", err.message);
        try {
          await queryInterface.changeColumn(
            "fee_policy_batches",
            "batch_id",
            {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            { transaction }
          );
        } catch (innerErr) {
          console.warn("changeColumn batch_id NULL failed:", innerErr.message);
        }
      } finally {
        await queryInterface.sequelize.query(
          "SET FOREIGN_KEY_CHECKS = 1;",
          { transaction }
        );
      }

      // 2. Ensure course_id column exists
      if (!tableDesc["course_id"]) {
        await queryInterface.addColumn(
          "fee_policy_batches",
          "course_id",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "course",
              key: "course_id",
            },
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
          },
          { transaction }
        );
      }

      // 3. Ensure term column exists
      if (!tableDesc["term"]) {
        await queryInterface.addColumn(
          "fee_policy_batches",
          "term",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
          },
          { transaction }
        );
      }

      // 4. Ensure year column is NULLABLE
      if (tableDesc["year"] && tableDesc["year"].allowNull === false) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `fee_policy_batches` MODIFY COLUMN `year` INT NULL DEFAULT NULL;",
            { transaction }
          );
        } catch (err) {
          console.warn("Make year nullable failed:", err.message);
        }
      }

      // 5. Drop uq_fee_policy_batch_year index if present
      const [existingIndexes] = await queryInterface.sequelize.query(
        "SHOW INDEX FROM `fee_policy_batches`;",
        { transaction }
      );
      const indexNames = new Set(existingIndexes.map((idx) => idx.Key_name));

      if (indexNames.has("uq_fee_policy_batch_year")) {
        try {
          await queryInterface.removeIndex(
            "fee_policy_batches",
            "uq_fee_policy_batch_year",
            { transaction }
          );
        } catch (err) {
          console.warn("Index uq_fee_policy_batch_year removal skipped:", err.message);
        }
      }

      // 6. Ensure composite index idx_fee_policy_course_year_term exists
      if (!indexNames.has("idx_fee_policy_course_year_term")) {
        try {
          await queryInterface.addIndex(
            "fee_policy_batches",
            ["fee_policy_id", "course_id", "year", "term"],
            {
              name: "idx_fee_policy_course_year_term",
              transaction,
            }
          );
        } catch (err) {
          console.warn("Add index idx_fee_policy_course_year_term skipped:", err.message);
        }
      }

      // 7. Backfill course_id from batch -> session -> course if batch_id is present
      try {
        await queryInterface.sequelize.query(
          `
          UPDATE fee_policy_batches fpb
          JOIN batch b ON fpb.batch_id = b.batch_id
          JOIN session s ON b.session_id = s.session_id
          SET fpb.course_id = s.course_id
          WHERE fpb.course_id IS NULL AND fpb.batch_id IS NOT NULL;
        `,
          { transaction }
        );
      } catch (err) {
        console.warn("Backfill course_id skipped:", err.message);
      }
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Revert is a safe no-op to prevent breaking existing data
    });
  },
};
