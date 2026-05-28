import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import assetIssueModel from "./assetIssueModel.js";
import assetModel from "./assetModel.js";

export default sequelize.define(
  "asset_issue_item",
  {
    assetIssueItemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "asset_issue_item_id",
    },
    assetIssueId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "asset_issue_id",
      references: {
        model: assetIssueModel,
        key: "asset_issue_id",
      },
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
    returnDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "return_date",
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "asset_issue_item",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);
