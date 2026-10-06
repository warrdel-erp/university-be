"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "fee_policy_slabs",
        {
          fee_policy_slab_id: {
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
          relative_period: {
            type: Sequelize.ENUM("before", "after"),
            allowNull: true,
          },
          from_unit: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          to_unit: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          slab_value: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.0,
          },
          order_index: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
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
        "fee_policy_slabs",
        ["fee_policy_id", "order_index"],
        {
          name: "idx_fee_policy_slab_order",
          transaction,
        }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("fee_policy_slabs", { transaction });
    });
  },
};
