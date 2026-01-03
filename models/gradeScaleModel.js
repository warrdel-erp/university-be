import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import gradeModel from "./gradeModel.js";

export default sequelize.define(
  "grade_scale",
  {
    gradeScaleId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "grade_scale_id",
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
    grade: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    minimun: {
      type: DataTypes.INTEGER,     
      allowNull: true,
    },

    maximum: {
      type: DataTypes.INTEGER,
      allowNull: true,            
    },

    gradePoint: {
      type: DataTypes.FLOAT,
      allowNull:false,
      field:'grade_point'
    },

    result: {
      type: DataTypes.STRING,
      allowNull: true,            
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
    tableName: "grade_scale",
    timestamps: true,
    paranoid: true,
  }
);
