import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";

export default sequelize.define(
  "asset_return_transaction",
  {
    assetReturnTransactionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "asset_return_transaction_id",
    },
    returnDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "return_date",
    },
  },
  {
    tableName: "asset_return_transaction",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);
