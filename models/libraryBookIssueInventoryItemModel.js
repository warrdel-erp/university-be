import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import libraryIssueBookTransactionModel from "./libraryIssueBookTransactionModel.js";
import libraryBookInventoryModel from "./libraryBookInventoryModel.js";

export default sequelize.define(
  "library_book_issue_inventory_item",
  {
    libraryBookIssueInventoryItemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "library_book_issue_inventory_item_id",
    },
    libraryIssueBookTransactionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "library_issue_book_transaction_id",
      references: {
        model: libraryIssueBookTransactionModel,
        key: "library_issue_book_transaction_id",
      },
    },
    inventoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "inventory_id",
      references: {
        model: libraryBookInventoryModel,
        key: "inventory_id",
      },
    },
    returnDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "return_date",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "updated_at",
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    tableName: "library_book_issue_inventory_item",
    timestamps: true,
    paranoid: true,
  },
);

