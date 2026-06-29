import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import amcVendorModel from "./amcVendorModel.js";

const amcVendorAddressModel = sequelize.define(
  "amc_vendor_address",
  {
    amcVendorAddressId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "amc_vendor_address_id",
    },
    amcVendorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: "amc_vendor_id",
      references: {
        model: amcVendorModel,
        key: "amc_vendor_id",
      },
    },
    addressLine: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "address_line",
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pincode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "amc_vendor_address",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

amcVendorAddressModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default amcVendorAddressModel;
