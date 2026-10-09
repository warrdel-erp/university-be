"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "fee_policy_components",
        {
          fee_policy_component_id: {
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
          fee_type_catalog_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "fee_type_catalog",
              key: "fee_type_catalog_id",
            },
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
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
        "fee_policy_components",
        ["fee_policy_id", "fee_type_catalog_id"],
        {
          unique: true,
          name: "uq_fee_policy_component",
          transaction,
        }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("fee_policy_components", { transaction });
    });
  },
};
