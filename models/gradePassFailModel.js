import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import gradeCourseModel from "./gradeCourseModel.js";
import examSetupTypeModel from "./examSetupTypeModel.js";
import gradeModel from "./gradeModel.js";

export default sequelize.define(
  "grade_pass_fail",
  {
    gradePassFailId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "grade_pass_fail_id",
    },
    gradeCourseId: {
         type: DataTypes.INTEGER,
         allowNull: false,
         field: "grade_course_id",
         references: {
           model: gradeCourseModel,
           key: "grade_course_id"
         }
    },
    gradeId: {
         type: DataTypes.INTEGER,
         allowNull: true,
         field: "grade_id",
         references: {
           model: gradeModel,
           key: "grade_id"
         }
    },
    examSetupTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'exam_setup_type_id',
        references: {
            model: examSetupTypeModel,
            key: 'exam_setup_type_id'
        }
    },
    overAllMinimum:{
        type:DataTypes.INTEGER,
        allowNull:true,
        field:'overall_minimum'
    },

    theoryMinimum:{
        type:DataTypes.INTEGER,
        allowNull:true,
        field:'theory_minimum'
    },

    practicalMinimum:{
        type:DataTypes.INTEGER,
        allowNull:true,
        field:'practical_minimum'
    },

    minimumPassingGrade:{
        type:DataTypes.INTEGER,
        allowNull:true,
        field:'minimum_passing_grade'
    },

    componentWisePass:{
        type:DataTypes.BOOLEAN,
        allowNull:false,
        defaultValue:false,
        field:'component_wise_pass'
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
    tableName: "grade_pass_fail",
    timestamps: true,
    paranoid: true,
  }
);
