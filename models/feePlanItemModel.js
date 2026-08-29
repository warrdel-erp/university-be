import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import feePlanProfileModel from "./feePlanProfileModel.js";
import instituteModel from "./instituteModel.js";

const feePlanItemModel = sequelize.define(
  "fee_plan_item",
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
        feePlanItemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "fee_plan_item_id",
    },
    createDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "create_date",
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "due_date",
    },
    feePlanProfileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "fee_plan_profile_id",
      references: {
        model: feePlanProfileModel,
        key: "fee_plan_profile_id",
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
    tableName: "fee_plan_item",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

feePlanItemModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default feePlanItemModel;
