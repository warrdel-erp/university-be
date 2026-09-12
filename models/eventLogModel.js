import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import eventModel from "./eventModel.js";
import university from "./universityModel.js";
import institute from "./instituteModel.js";
import acedmicYear from "./acedmicYearModel.js";

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
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "event_id",
      references: {
        model: eventModel,
        key: "event_id",
      },
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "university_id",
      references: {
        model: university,
        key: "university_id",
      },
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "institute_id",
      references: {
        model: institute,
        key: "institute_id",
      },
    },
    academicYearId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "acedmic_year_id",
      references: {
        model: acedmicYear,
        key: "acedmic_year_id",
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
