import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import studentModel from "./studentModel.js";
import feePlanItemModel from "./feePlanItemModel.js";
import instituteModel from "./instituteModel.js";

export default sequelize.define(
  "student_fee_invoice",
  {
    studentFeeInvoiceId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "student_fee_invoice_id",
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    createDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "create_date",
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "due_date",
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("non_generated", "generated"),
      allowNull: false,
      defaultValue: "non_generated",
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "student_id",
      references: {
        model: studentModel,
        key: "student_id",
      },
    },
    feePlanItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "fee_plan_item_id",
      references: {
        model: feePlanItemModel,
        key: "fee_plan_item_id",
      },
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "institute_id",
      references: {
        model: instituteModel,
        key: "institute_id",
      },
    },
  },
  {
    tableName: "student_fee_invoice",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);
