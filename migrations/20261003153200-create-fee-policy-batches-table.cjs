"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
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
            allowNull: false,
            references: {
              model: "batch",
              key: "batch_id",
            },
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
          },
          year: {
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
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        "fee_policy_batches",
        ["fee_policy_id", "batch_id", "year"],
        {
          unique: true,
          name: "uq_fee_policy_batch_year",
          transaction,
        }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("fee_policy_batches", { transaction });
    });
  },
};
