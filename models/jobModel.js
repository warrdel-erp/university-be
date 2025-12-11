import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import departmentModel from "./departmentModel.js";
import courseModel from "./courseModel.js";
import subjectModel from "./subjectModel.js";
import employeeModel from "./employeeModel.js";
import users from "./userModel.js";
import jobSettingModel from "./jobSettingModel.js";

export default sequelize.define(
  "jobs",
  {
    jobId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "job_id",
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
    jobTitle: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "job_title",
    },

    jobSettingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "job_setting_id",
      references: {
        model: jobSettingModel,
        key: "job_setting_id",
      },
    },

    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "department_id",
      references: {
        model: departmentModel,
        key: "department_id",
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

    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "subject_id",
      references: {
        model: subjectModel,
        key: "subject_id",
      },
    },

    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "employee_id",
      references: {
        model: employeeModel,
        key: "employee_id",
      },
    },

    allowSwap: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "allow_swap",
    },

    jobDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "job_date",
    },

    startTime: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "start_time",
    },

    endTime: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "end_time",
    },

    recurrence: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    priority: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "priority",
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Active",
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
    tableName: "jobs",
    timestamps: true,
    paranoid: true,
  }
);