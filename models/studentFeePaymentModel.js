import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import studentFeeInvoiceModel from "./studentFeeInvoiceModel.js";
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
    studentFeeInvoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "student_fee_invoice_id",
      references: {
        model: studentFeeInvoiceModel,
        key: "student_fee_invoice_id",
      },
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
    paidAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: "paid_amount",
    },
    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "payment_date",
    },
    paymentMethod: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "payment_method",
    },
    referenceNumber: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "reference_number",
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
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
