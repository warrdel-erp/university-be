import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import instituteModel from "./instituteModel.js";
import assetCategoryModel from "./assetCategoryModel.js";

const amcVendorModel = sequelize.define(
  "amc_vendor",
  {
    amcVendorId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "amc_vendor_id",
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
    vendorName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "vendor_name",
    },
    vendorCode: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "vendor_code",
    },
    contactPerson: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "contact_person",
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gstNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "gst_number",
    },
    assetCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "asset_category_id",
      references: {
        model: assetCategoryModel,
        key: "asset_category_id",
      },
    },
  },
  {
    tableName: "amc_vendor",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

amcVendorModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default amcVendorModel;
