import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";

export default sequelize.define(
  "answer_sheet_qr",
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    qr: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "student_id",
      references: {
        model: "students",
        key: "student_id",
      },
    },
    examScheduleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
      field: "exam_schedule_id",
      references: {
        model: "exam_schedule",
        key: "exam_schedule_id",
      },
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "institute_id",
      references: {
        model: "institute",
        key: "institute_id",
      },
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "university_id",
      references: {
        model: "university",
        key: "university_id",
      },
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
    tableName: "answer_sheet_qr",
    timestamps: true,
  }
);