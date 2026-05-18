import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import feeTypeCatalogModel from "./feeTypeCatalogModel.js";
import studentFeeInvoiceModel from "./studentFeeInvoiceModel.js";

export default sequelize.define(
  "student_invoice_additional_fee",
  {
    studentInvoiceAdditionalFeeId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "student_invoice_additional_fee_id",
    },
    studentFeeInvoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "student_fee_invoice_id",
      references: {
        model: studentFeeInvoiceModel,
        key: "student_fee_invoice_id",
      },
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    waiver: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    feeTypeCatalogId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "fee_type_catalog_id",
      references: {
        model: feeTypeCatalogModel,
        key: "fee_type_catalog_id",
      },
    },
  },
  {
    tableName: "student_invoice_additional_fee",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);
