"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "refresh_tokens",
        {
          refresh_token_id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "users",
              key: "user_id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          token_hash: {
            type: Sequelize.STRING(128),
            allowNull: false,
            unique: true,
          },
          family_id: {
            type: Sequelize.STRING(64),
            allowNull: false,
          },
          device_info: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          ip_address: {
            type: Sequelize.STRING(45),
            allowNull: true,
          },
          user_agent: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          expires_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          is_revoked: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          revoked_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          revoked_reason: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          replaced_by_token_id: {
            type: Sequelize.BIGINT,
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

      // Add indexes for efficient querying and rotation lookups
      await queryInterface.addIndex("refresh_tokens", ["family_id"], {
        name: "idx_refresh_tokens_family_id",
        transaction,
      });

      await queryInterface.addIndex("refresh_tokens", ["user_id"], {
        name: "idx_refresh_tokens_user_id",
        transaction,
      });

      await queryInterface.addIndex("refresh_tokens", ["expires_at"], {
        name: "idx_refresh_tokens_expires_at",
        transaction,
      });

      await queryInterface.addIndex("refresh_tokens", ["is_revoked"], {
        name: "idx_refresh_tokens_is_revoked",
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("refresh_tokens");
  },
};
