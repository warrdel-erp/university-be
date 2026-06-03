import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";

export default sequelize.define(
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
