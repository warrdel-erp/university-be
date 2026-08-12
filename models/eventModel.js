import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import university from "./universityModel.js";
import institute from "./instituteModel.js";
import acedmicYear from "./acedmicYearModel.js";

const eventModel = sequelize.define(
  "event",
  {
    eventId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "event_id",
    },
    eventType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "event_type",
    },
    status: {
      type: DataTypes.ENUM("PENDING", "SUCCESS", "FAILED"),
      allowNull: false,
      defaultValue: "PENDING",
      field: "status",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "user_id",
      references: {
        model: users,
        key: "user_id",
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
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message",
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "completed_at",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "updated_at",
    },
  },
  {
    tableName: "event",
    timestamps: true,
    paranoid: false,
  },
);

eventModel.scopeConfig = {
  university: false,
  institute: false,
  academicYear: false,
};

export default eventModel;
