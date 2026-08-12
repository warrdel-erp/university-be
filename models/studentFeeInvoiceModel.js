import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import studentModel from "./studentModel.js";
import feePlanItemModel from "./feePlanItemModel.js";
import instituteModel from "./instituteModel.js";

const studentFeeInvoiceModel = sequelize.define(
  "student_fee_invoice",
  {
            universityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'university_id',
            references: {
                model: universityModel,
                key: 'university_id'
            }
        },
        studentFeeInvoiceId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "student_fee_invoice_id",
    },
    createDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "create_date",
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "due_date",
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("non_generated", "generated"),
      allowNull: false,
      defaultValue: "non_generated",
    },
    paymentStatus: {
      type: DataTypes.ENUM("unpaid", "partial", "paid"),
      allowNull: false,
      defaultValue: "unpaid",
      field: "payment_status",
    },
    paidAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: "paid_amount",
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "student_id",
      references: {
        model: studentModel,
        key: "student_id",
      },
    },
    feePlanItemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "fee_plan_item_id",
      references: {
        model: feePlanItemModel,
        key: "fee_plan_item_id",
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
  },
  {
    tableName: "student_fee_invoice",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

studentFeeInvoiceModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default studentFeeInvoiceModel;
