import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import eventModel from "./eventModel.js";

const eventLogModel = sequelize.define(
  "event_log",
  {
    eventLogId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
      field: "event_log_id",
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "event_id",
      references: {
        model: eventModel,
        key: "event_id",
      },
    },
    entity: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "entity",
    },
    entityId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "entity_id",
    },
    action: {
      type: DataTypes.ENUM(
        "CREATE",
        "UPDATE",
        "DELETE",
        "BULK_CREATE",
        "BULK_UPDATE",
        "BULK_DELETE",
      ),
      allowNull: false,
      field: "action",
    },
    oldData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "old_data",
    },
    newData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "new_data",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "created_at",
    },
  },
  {
    tableName: "event_log",
    timestamps: true,
    updatedAt: false,
    paranoid: false,
  },
);

eventLogModel.scopeConfig = {
  university: false,
  institute: false,
  academicYear: false,
};

export default eventLogModel;
