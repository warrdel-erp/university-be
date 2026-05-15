import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import additionalFeeModel from "./additionalFeeModel.js";

export default sequelize.define(
  "student_invoice_additional_fee",
  {
    studentInvoiceAdditionalFeeId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "student_invoice_additional_fee_id",
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    waiver: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    additionalFeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "additional_fee_id",
      references: {
        model: additionalFeeModel,
        key: "additional_fee_id",
      },
    },
  },
  {
    tableName: "student_invoice_additional_fee",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);
