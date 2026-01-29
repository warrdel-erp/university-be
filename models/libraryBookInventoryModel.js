import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import libraryBookModel from "./libraryBookModel.js";
import libraryAisleModel from "./libraryAisleModel.js";
import libraryRackModel from "./libraryRackModel.js";
import libraryRowModel from "./libraryRowModel.js";
import studentModel from "./studentModel.js";
import employeeModel from "./employeeModel.js";

export default sequelize.define(
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
    excisionNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "excision_number",
    },
    libraryAisleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
      field: "employee_id",
      references: {
        model: employeeModel,
        key: "employee_id",
      },
    },
    libraryRackId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "library_rack_id",
      references: {
        model: libraryRackModel,
        key: "library_rack_id",
      },
    },
    libraryRowId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
