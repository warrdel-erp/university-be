import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";

/**
 * Batch assignment of answer sheets to an evaluator.
 * One row per assign action; linked answer_sheet_qr rows share assignmentId.
 */
const answersheetEvalutionUserAssignmentModel = sequelize.define(
  "answersheet_evalution_user_assignment",
  {
    assignmentId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "assignment_id",
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "university_id",
      references: {
        model: universityModel,
        key: "university_id",
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
    academicYearId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "acedmic_year_id",
      references: {
        model: acedmicYearModel,
        key: "acedmic_year_id",
      },
    },
    assignedToUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "assigned_to_user_id",
      references: {
        model: users,
        key: "user_id",
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
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
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "updated_by",
      references: {
        model: users,
        key: "user_id",
      },
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
    tableName: "answersheet_evalution_user_assignment",
    timestamps: true,
  },
);

answersheetEvalutionUserAssignmentModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: true,
};

export default answersheetEvalutionUserAssignmentModel;
