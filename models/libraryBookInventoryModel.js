import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import libraryBookModel from "./libraryBookModel.js";
import libraryAisleModel from "./libraryAisleModel.js";
import libraryRackModel from "./libraryRackModel.js";
import libraryRowModel from "./libraryRowModel.js";
import studentModel from "./studentModel.js";
import employeeModel from "./employeeModel.js";

const libraryBookInventoryModel = sequelize.define(
  "library_book_inventory",
  {
    inventoryId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "inventory_id",
    },
    libraryBookId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "library_book_id",
      references: {
        model: libraryBookModel,
        key: "library_book_id",
      },
    },
    accessionNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "accession_number",
    },
    billNo: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "bill_no",
    },
    billDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "bill_date",
    },
    itemPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "item_price",
    },
    netPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "net_price",
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    libraryAisleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "library_aisle_id",
      references: {
        model: libraryAisleModel,
        key: "library_aisle_id",
      },
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "student_id",
      references: {
        model: studentModel,
        key: "student_id",
      },
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
      references: {
        model: employeeModel,
        key: 'user_id',
      },
    },
    libraryRackId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "library_rack_id",
      references: {
        model: libraryRackModel,
        key: "library_rack_id",
      },
    },
    libraryRowId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "library_row_id",
      references: {
        model: libraryRowModel,
        key: "library_row_id",
      },
    },
    issueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "issue_date",
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "due_date",
    },
    status: {
      type: DataTypes.ENUM("available", "issued"),
      defaultValue: "available",
    },
    condition: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "updated_at",
    },
    deletedAt: {
      type: DataTypes.DATE,
      field: "deleted_at",
    },
  },
  {
    tableName: "library_book_inventory",
    timestamps: true,
    paranoid: true,
  },
);

libraryBookInventoryModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default libraryBookInventoryModel;
