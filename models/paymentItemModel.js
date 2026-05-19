import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import studentFeePaymentModel from "./studentFeePaymentModel.js";

export default sequelize.define(
  "payment_item",
  {
    paymentItemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "payment_item_id",
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "payment_id",
      references: {
        model: studentFeePaymentModel,
        key: "student_fee_payment_id",
      },
    },
    referenceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "reference_id",
    },
    referenceType: {
      type: DataTypes.ENUM("STUDENT_FEE_INVOICE", "STUDENT_LIBRARY_INVOICE"),
      allowNull: false,
      field: "reference_type",
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
  },
  {
    tableName: "payment_item",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);
