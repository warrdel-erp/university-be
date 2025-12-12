import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";

export default sequelize.define(
  "job_settings",
  {
    jobSettingId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "job_setting_id",
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
    jobTypeName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "job_type_name",
    },

    defaultDuration: {
      type: DataTypes.INTEGER,     
      allowNull: true,
      field: "default_duration",
    },

    colorCode: {
      type: DataTypes.STRING,
      allowNull: true,            
      field: "color_code",
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
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
    tableName: "job_settings",
    timestamps: true,
    paranoid: true,
  }
);
