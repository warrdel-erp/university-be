import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import assetIssueTransactionModel from "./assetIssueTransactionModel.js";
import assetInventoryItemModel from "./assetInventoryItemModel.js";
import assetReturnTransactionModel from "./assetReturnTransactionModel.js";
import { assetConditions } from "../constant.js";

const assetIssueInventoryItemModel = sequelize.define(
  "asset_issue_inventory_item",
  {
    assetIssueInventoryItemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "asset_issue_inventory_item_id",
    },
    assetIssueTransactionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "asset_issue_transaction_id",
      references: {
        model: assetIssueTransactionModel,
        key: "asset_issue_transaction_id",
      },
    },
    assetInventoryItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "asset_inventory_item_id",
      references: {
        model: assetInventoryItemModel,
        key: "asset_inventory_item_id",
      },
    },
    assetReturnTransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "asset_return_transaction_id",
      references: {
        model: assetReturnTransactionModel,
        key: "asset_return_transaction_id",
      },
    },
    damageNotes: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "damage_notes",
    },
    returnCondition: {
      type: DataTypes.ENUM(...assetConditions),
      allowNull: true,
      field: "return_condition",
    },
  },
  {
    tableName: "asset_issue_inventory_item",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

assetIssueInventoryItemModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default assetIssueInventoryItemModel;
