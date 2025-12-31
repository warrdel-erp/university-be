import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import gradeModel from "./gradeModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import courseModel from "./courseModel.js";
import sessionModel from "./sessionModel.js";

export default sequelize.define(
  "grade_course",
  {
    gradeCourseId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "grade_course_id",
    },
    gradeId: {
         type: DataTypes.INTEGER,
         allowNull: false,
         field: "grade_id",
         references: {
           model: gradeModel,
           key: "grade_id"
         }
    },
    acedmicYearId: {
         type: DataTypes.INTEGER,
         allowNull: false,
         field: "acedmic_year_id",
         references: {
           model: acedmicYearModel,
           key: "acedmic_year_id"
         }
    },
    courseId: {
         type: DataTypes.INTEGER,
         allowNull: false,
         field: "course_id",
        references: {
           model: courseModel,
           key: "course_id"
        }
    },
    sessionId: {
         type: DataTypes.INTEGER,
         allowNull: false,
         field: "session_id",
        references: {
           model: sessionModel,
           key: "session_id"
        }
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
    tableName: "grade_course",
    timestamps: true,
    paranoid: true,
  }
);
