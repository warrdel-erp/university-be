"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Make batch_id nullable
      try {
        await queryInterface.sequelize.query(
          "ALTER TABLE `fee_policy_batches` MODIFY COLUMN `batch_id` INT NULL;",
          { transaction }
        );
      } catch {
        await queryInterface.changeColumn(
          "fee_policy_batches",
          "batch_id",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction }
        );
      }

      // 2. Add course_id column
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

      // 3. Add term column
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

      // 4. Drop old unique index if it exists
      try {
        await queryInterface.removeIndex(
          "fee_policy_batches",
          "uq_fee_policy_batch_year",
          { transaction }
        );
      } catch (err) {
        // index might already be absent or named differently
        console.warn("uq_fee_policy_batch_year index removal skipped:", err.message);
      }

      // 5. Seed existing records with correct course_id from batch -> session -> course
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
        console.warn("Seeding existing course_id in fee_policy_batches skipped:", err.message);
      }

      // 6. Add composite index for course, year, term queries
      await queryInterface.addIndex(
        "fee_policy_batches",
        ["fee_policy_id", "course_id", "year", "term"],
        {
          name: "idx_fee_policy_course_year_term",
          transaction,
        }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      try {
        await queryInterface.removeIndex(
          "fee_policy_batches",
          "idx_fee_policy_course_year_term",
          { transaction }
        );
      } catch {}

      await queryInterface.removeColumn("fee_policy_batches", "term", { transaction });
      await queryInterface.removeColumn("fee_policy_batches", "course_id", { transaction });

      await queryInterface.changeColumn(
        "fee_policy_batches",
        "batch_id",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "batch",
            key: "batch_id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        { transaction }
      );

      try {
        await queryInterface.addIndex(
          "fee_policy_batches",
          ["fee_policy_id", "batch_id", "year"],
          {
            unique: true,
            name: "uq_fee_policy_batch_year",
            transaction,
          }
        );
      } catch {}
    });
  },
};
