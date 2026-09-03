import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";

const libraryReturnBookTransactionModel = sequelize.define(
  "library_return_book_transaction",
  {
    libraryReturnBookTransactionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "library_return_book_transaction_id",
    },
    returnDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "return_date",
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "university_id",
      references: { model: "university", key: "university_id" }
    },
    campusId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "campus_id",
      references: { model: "campus", key: "campus_id" }
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "institute_id",
      references: { model: "institute", key: "institute_id" }
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
  },
  {
    tableName: "library_return_book_transaction",
    timestamps: true,
    paranoid: false,
  },
);

libraryReturnBookTransactionModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default libraryReturnBookTransactionModel;
