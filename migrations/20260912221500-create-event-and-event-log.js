"use strict";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      "event",
      {
        event_id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        event_type: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM("PENDING", "SUCCESS", "FAILED"),
          allowNull: false,
          defaultValue: "PENDING",
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "users",
            key: "user_id",
          },
        },
        university_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "university",
            key: "university_id",
          },
        },
        institute_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "institute",
            key: "institute_id",
          },
        },
        acedmic_year_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "acedmic_year",
            key: "acedmic_year_id",
          },
        },
        error_message: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        completed_at: {
          type: Sequelize.DATE,
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
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "event_log",
      {
        event_log_id: {
          type: Sequelize.BIGINT,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        event_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "event",
            key: "event_id",
          },
        },
        university_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "university",
            key: "university_id",
          },
        },
        institute_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "institute",
            key: "institute_id",
          },
        },
        acedmic_year_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "acedmic_year",
            key: "acedmic_year_id",
          },
        },
        entity: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        entity_id: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        action: {
          type: Sequelize.ENUM(
            "CREATE",
            "UPDATE",
            "DELETE",
            "BULK_CREATE",
            "BULK_UPDATE",
            "BULK_DELETE",
          ),
          allowNull: false,
        },
        old_data: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        new_data: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      },
      { transaction },
    );

    await queryInterface.addIndex("event", ["event_type"], {
      name: "idx_event_event_type",
      transaction,
    });
    await queryInterface.addIndex("event", ["status"], {
      name: "idx_event_status",
      transaction,
    });
    await queryInterface.addIndex("event_log", ["event_id"], {
      name: "idx_event_log_event_id",
      transaction,
    });
    await queryInterface.addIndex("event_log", ["entity", "entity_id"], {
      name: "idx_event_log_entity_entity_id",
      transaction,
    });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(queryInterface) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.dropTable("event_log", { transaction });
    await queryInterface.dropTable("event", { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
