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

libraryIssueBookTransactionModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default libraryIssueBookTransactionModel;
