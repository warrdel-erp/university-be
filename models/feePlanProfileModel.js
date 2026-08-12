import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import sessionCouseMappingModel from "./sessionCouseMappingModel.js";

/** ERD-style fee plan (type, name, course–session link, institute). Table `fee_plan_profile` — legacy `fee_plan` remains in feePlanModel.js. */
const feePlanProfileModel = sequelize.define(
  "fee_plan_profile",
  {
            universityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'university_id',
            references: {
                model: universityModel,
                key: 'university_id'
            }
        },
        feePlanProfileId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "fee_plan_profile_id",
    },
    planType: {
      type: DataTypes.ENUM("annual", "semester", "trimester"),
      allowNull: false,
      field: "plan_type",
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "category",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    courseSessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "course_session_id",
      references: {
        model: sessionCouseMappingModel,
        key: "session_course_mapping_id",
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
    publishStatus: {
      type: DataTypes.ENUM("draft", "published"),
      allowNull: false,
      defaultValue: "draft",
      field: "publish_status",
    },
  },
  {
    tableName: "fee_plan_profile",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

feePlanProfileModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default feePlanProfileModel;
