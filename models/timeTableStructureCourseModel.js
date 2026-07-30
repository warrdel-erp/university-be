import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import university from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYear from "./acedmicYearModel.js";
import sessionModel from "./sessionModel.js";
import courseModel from "./courseModel.js";
import timeTableStructureModel from "./timeTableStructureModel.js";
import academicGroupScopeModel from "./academicGroupScopeModel.js";

const timeTableStructureCourseModel = sequelize.define(
  "time_table_structure_course",
  {
    timetableStructureCourseMapperId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "timetable_structure_course_mapper_id",
    },
    timeTableNameId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "time_table_name_id",
      references: {
        model: timeTableStructureModel,
        key: "time_table_name_id",
      },
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "course_id",
      references: {
        model: courseModel,
        key: "course_id",
      },
    },
    academicGroupScopeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "academic_group_scope_id",
      references: {
        model: academicGroupScopeModel,
        key: "academic_group_scope_id",
      },
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "university_id",
      references: {
        model: university,
        key: "university_id",
      },
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "institute_id",
      references: {
        model: instituteModel,
        key: "institute_id",
      },
    },
    academicYearId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "acedmic_year_id",
      references: {
        model: acedmicYear,
        key: "acedmic_year_id",
      },
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "session_id",
      references: {
        model: sessionModel,
        key: "session_id",
      },
    },
    startingDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "starting_date",
    },
    endingDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "ending_date",
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
  },
  {
    tableName: "time_table_structure_course",
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ["time_table_name_id", "course_id", "session_id"],
        name: "uniq_tts_course_session",
      },
    ],
  },
);

timeTableStructureCourseModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: true,
};

export default timeTableStructureCourseModel;
