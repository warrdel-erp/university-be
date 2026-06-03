import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import instituteModel from "./instituteModel.js";
import users from "./userModel.js";

export default sequelize.define(
  "student_fee_payment",
  {
    studentFeePaymentId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "student_fee_payment_id",
    },
    paymentType: {
      type: DataTypes.ENUM("INCOMING", "OUTGOING"),
      allowNull: false,
      defaultValue: "INCOMING",
      field: "payment_type",
    },
    payeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "payee_id",
    },
    payeeType: {
      type: DataTypes.ENUM("STUDENT", "VENDOR", "OTHER"),
      allowNull: false,
      field: "payee_type",
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.ENUM("credit_card", "bank_transfer", "cash", "cheque"),
      allowNull: false,
      field: "payment_method",
    },
    referenceNumber: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "reference_number",
    },
    transactionId: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "transaction_id",
    },
    receivedBy: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: null,
      field: "received_by",
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
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
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "created_by",
      references: {
        model: users,
        key: "user_id",
      },
    },
  },
  {
    tableName: "student_fee_payment",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);
