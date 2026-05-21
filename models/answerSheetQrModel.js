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
    requestId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "request_id",
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
      field: "exam_schedule_id",
      references: {
        model: "exam_schedule",
        key: "exam_schedule_id",
      },
    },
    assignedToUser: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "assigned_to_user",
      references: {
        model: "users",
        key: "user_id",
      },
    },
    evaluatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "evaluated_at",
    },
    obtainedMarks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "obtained_marks",
    },
    isUploaded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_uploaded",
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
    indexes: [
      {
        name: "uq_answer_sheet_qr_student_exam",
        unique: true,
        fields: ["student_id", "exam_schedule_id"],
      },
    ],
  }
);