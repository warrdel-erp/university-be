import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import instituteModel from "./instituteModel.js";
import sessionCouseMappingModel from "./sessionCouseMappingModel.js";

/** ERD-style fee plan (type, name, course–session link, institute). Table `fee_plan_profile` — legacy `fee_plan` remains in feePlanModel.js. */
export default sequelize.define(
  "fee_plan_profile",
  {
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
  },
  {
    tableName: "fee_plan_profile",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);
