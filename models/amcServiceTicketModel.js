import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import instituteModel from "./instituteModel.js";
import assetModel from "./assetModel.js";
import assetCategoryModel from "./assetCategoryModel.js";
import amcVendorModel from "./amcVendorModel.js";
import {
  serviceTicketIssueTypes,
  serviceTicketPriorities,
  serviceTicketStatuses,
} from "../constant.js";

const amcServiceTicketModel = sequelize.define(
  "amc_service_ticket",
  {
    serviceTicketId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "amc_service_ticket_id",
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
    ticketNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "ticket_number",
    },
    assetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "asset_id",
      references: {
        model: assetModel,
        key: "asset_id",
      },
    },
    amcVendorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "amc_vendor_id",
      references: {
        model: amcVendorModel,
        key: "amc_vendor_id",
      },
    },
    assetCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "asset_category_id",
      references: {
        model: assetCategoryModel,
        key: "asset_category_id",
      },
    },
    issue: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    issueType: {
      type: DataTypes.ENUM(...serviceTicketIssueTypes),
      allowNull: false,
      field: "issue_type",
    },
    problemDescription: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "problem_description",
    },
    downtimeStartedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "downtime_started_at",
    },
    priority: {
      type: DataTypes.ENUM(...serviceTicketPriorities),
      allowNull: false,
      defaultValue: "MEDIUM",
    },
    status: {
      type: DataTypes.ENUM(...serviceTicketStatuses),
      allowNull: false,
      defaultValue: "OPEN",
    },
  },
  {
    tableName: "amc_service_ticket",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

amcServiceTicketModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default amcServiceTicketModel;
