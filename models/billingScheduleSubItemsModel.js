import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import feePlanSubItemsModel from "./feePlanSubItemsModel.js";
import billingScheduleItemsModel from "./billingScheduleItemsModel.js";

const billingScheduleSubItemsModel = sequelize.define(
  "billing_schedule_sub_items",
  {
    billingScheduleSubItemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "billing_schedule_sub_item_id",
    },
    billingScheduleItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "billing_schedule_item_id",
      references: {
        model: billingScheduleItemsModel,
        key: "billing_schedule_item_id",
      },
    },
    feePlanSubItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "fee_plan_sub_item_id",
      references: {
        model: feePlanSubItemsModel,
        key: "fee_plan_sub_item_id",
      },
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: "amount",
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "university_id",
      references: {
        model: universityModel,
        key: "university_id",
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
  },
  {
    tableName: "billing_schedule_sub_items",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

billingScheduleSubItemsModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: false,
};

export default billingScheduleSubItemsModel;
