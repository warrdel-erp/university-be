import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import feeTypeCatalogModel from "./feeTypeCatalogModel.js";
import studentFeeInvoiceModel from "./studentFeeInvoiceModel.js";

const studentFeeInvoiceItemsModel = sequelize.define(
  "student_fee_invoice_items",
  {
    studentFeeInvoiceItemsId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "student_fee_invoice_items_id",
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    isMainItem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_main_item",
    },
    waiver: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    feeTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "fee_type_catalog_id",
      references: {
        model: feeTypeCatalogModel,
        key: "fee_type_catalog_id",
      },
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
  },
  {
    tableName: "student_fee_invoice_items",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

studentFeeInvoiceItemsModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default studentFeeInvoiceItemsModel;
