"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "fee_policy",
        {
          fee_policy_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          university_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          institute_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          policy_name: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          applies_to: {
            type: Sequelize.ENUM("all_components", "selected_components"),
            allowNull: false,
            defaultValue: "selected_components",
          },
          effect: {
            type: Sequelize.ENUM("reduce_fee", "add_charge", "refund"),
            allowNull: false,
          },
          calculation_type: {
            type: Sequelize.ENUM(
              "percentage",
              "fixed_amount",
              "per_day",
              "percentage_of_outstanding",
              "slab_based"
            ),
            allowNull: false,
          },
          percentage_rate: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          fixed_amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: true,
          },
          grace_period_days: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          max_cap_amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: true,
          },
          reference_date_event: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          publish_status: {
            type: Sequelize.ENUM("draft", "published"),
            allowNull: false,
            defaultValue: "draft",
          },
          published_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          published_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          created_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          updated_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
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
        "fee_policy",
        ["university_id", "institute_id"],
        {
          name: "idx_fee_policy_tenant",
          transaction,
        }
      );
      await queryInterface.addIndex("fee_policy", ["publish_status"], {
        name: "idx_fee_policy_publish_status",
        transaction,
      });
      await queryInterface.addIndex("fee_policy", ["effect"], {
        name: "idx_fee_policy_effect",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("fee_policy", { transaction });
    });
  },
};
