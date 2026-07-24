import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";

const libraryIssueBookTransactionModel = sequelize.define(
  "library_issue_book_transaction",
  {
    libraryIssueBookTransactionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "library_issue_book_transaction_id",
    },
    // STUDENT → students.student_id; TEACHER → employee.user_id (see memberType)
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    tableName: "library_issue_book_transaction",
    timestamps: true,
    paranoid: true,
  },
);

libraryIssueBookTransactionModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default libraryIssueBookTransactionModel;
