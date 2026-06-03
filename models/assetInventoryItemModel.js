import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import instituteModel from "./instituteModel.js";
import assetModel from "./assetModel.js";
import assetLocationModel from "./assetLocationModel.js";

export default sequelize.define(
  "asset_inventory_item",
  {
    assetInventoryItemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "asset_inventory_item_id",
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "asset_id",
      references: {
        model: assetModel,
        key: "asset_id",
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
    locationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "location_id",
      references: {
        model: assetLocationModel,
        key: "asset_location_id",
      },
    },
  },
  {
    tableName: "asset_inventory_item",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);
