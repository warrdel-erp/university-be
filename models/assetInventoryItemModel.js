import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import instituteModel from "./instituteModel.js";
import assetModel from "./assetModel.js";
import classRoomModel from "./classRoomModel.js";
import { assetInventoryStatuses } from "../constant.js";

const assetInventoryItemModel = sequelize.define(
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
    classRoomSectionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "class_room_section_id",
      references: {
        model: classRoomModel,
        key: "class_room_section_id",
      },
    },
    status: {
      type: DataTypes.ENUM(...assetInventoryStatuses),
      allowNull: false,
      defaultValue: "NOT_ASSIGNED",
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

assetInventoryItemModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default assetInventoryItemModel;
