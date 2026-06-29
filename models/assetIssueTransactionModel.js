import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import instituteModel from "./instituteModel.js";

const assetIssueTransactionModel = sequelize.define(
  "asset_issue_transaction",
  {
    assetIssueTransactionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "asset_issue_transaction_id",
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
    memberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "member_id",
    },
    memberType: {
      type: DataTypes.ENUM("STUDENT", "TEACHER"),
      allowNull: false,
      field: "member_type",
    },
    issueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "issue_date",
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "due_date",
    },
  },
  {
    tableName: "asset_issue_transaction",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

assetIssueTransactionModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default assetIssueTransactionModel;
