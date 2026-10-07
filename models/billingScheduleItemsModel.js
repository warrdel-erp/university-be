import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import feePlanItemModel from "./feePlanItemModel.js";

const billingScheduleItemsModel = sequelize.define(
  "billing_schedule_items",
  {
    billingScheduleItemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "billing_schedule_item_id",
    },
    feePlanItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "fee_plan_item_id",
      references: {
        model: feePlanItemModel,
        key: "fee_plan_item_id",
      },
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: "amount",
    },
    plannedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "planned_date",
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "pending",
      field: "status",
      comment: "Status of the billing schedule item (e.g. pending, scheduled, billed, cancelled)",
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
    tableName: "billing_schedule_items",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

billingScheduleItemsModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: false,
};

export default billingScheduleItemsModel;
