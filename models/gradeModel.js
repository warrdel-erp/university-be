import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import users from "./userModel.js";

export default sequelize.define(
  "grade",
  {
    gradeId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "grade_id",
    },
      universityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "university_id",
      references: {
        model: universityModel,
        key: "university_id"
      }
    },

    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "institute_id",
      references: {
        model: instituteModel,
        key: "institute_id"
      }
    },
    schemeName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "scheme_name",
    },
    regulationCode: {
      type: DataTypes.STRING,
      allowNull:true,
      field: "regulation_code",
    },
    gradingType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "grading_type",
    },
    marksSystem: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "marks_system",
    },

    gpsFormula: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "gps_formula",
    },

    decimalPrecision: {
      type: DataTypes.STRING,
      allowNull: true,
      field:'decimal_precision'
    },

    roundingRule: {
      type: DataTypes.STRING,
      allowNull: true,
      field:'rounding_rule'
    },

    includeFailedSubjectsInGpa: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue:false,
      field: "include_failed_subject_in_gpa",
    },

    includeSemester: {
      type: DataTypes.STRING,
      allowNull: true,
      field:'include_semester'
    },

    gradeReplacementRule: {
      type: DataTypes.STRING,
      allowNull: false,
      field:'grade_replacement_rule'
    },

    maxAttemptsAllowed: {
      type: DataTypes.STRING,
      allowNull: false,
      field:'max_attempts_allowed'
    },

    improvementAllowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue:false,
      field:'improvement_allowed'
    },

    carryInternalMarksInBacklogs: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue:false,
      field:'carry_internal_marks_in_backlogs'
    },

    gradeMarksEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue:false,
      field:'grade_marks_enabled'
    },

    maxGracePerSubjects: {
      type: DataTypes.STRING,
      allowNull: false,
      field:'max_grace_per_subjects'
    },

    maxGracePerSemester: {
      type: DataTypes.STRING,
      allowNull: false,
      field:'max_grace_per_semester'
    },

    applyGrace: {
      type: DataTypes.STRING,
      allowNull: false,
      field:'apply_grace'
    },

    moderationType: {
      type: DataTypes.STRING,
      allowNull: false,
      field:'moderation_type'
    },

    moderationValue: {
      type: DataTypes.STRING,
      allowNull: false,
      field:'moderation_value'
    },

    minimumAttendance: {
      type: DataTypes.STRING,
      allowNull: true,
      field:'minimum_attendance'
    },

    condonationAllowed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue:true,
      field:'condonation_allowed'
    },

    condonationLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field:'condonation_limit'
    },

    ifAttendanceMinimum: {
      type: DataTypes.STRING,
      allowNull: true,
      field:'if_attendance_minimum'
    },

    resultStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      field:'result_status'
    },

    saveType:{
        type:DataTypes.ENUM("DRAFT", "FINAL"),
        allowNull:false,
        field:'save_type'
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

    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    tableName: "grade",
    timestamps: true,
    paranoid: true,
  }
);