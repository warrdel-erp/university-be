import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";

export default sequelize.define(
  "s3_files",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    entityType: {
      type: DataTypes.ENUM(
        "student_photo",
        "employee_document",
        "FULL_EXAM_ANSWER_SHEET_PDF",
        "answer_sheet",
        "student"
      ),
      allowNull: false,
      field: "entity_type",
    },
    entityId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "entity_id",
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "company_id",
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: "size",
    },
    mime: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "mime",
    },
    status: {
      type: DataTypes.ENUM("pending", "active"),
      allowNull: false,
      defaultValue: "pending",
      field: "status",
    },
    s3Key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: "s3_key",
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "original_name",
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "created_by",
      references: {
        model: "users",
        key: "user_id",
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
    tableName: "s3_files",
    timestamps: true,
  }
);
