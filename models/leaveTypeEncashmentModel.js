import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import leaveTypeModel from "./leaveTypeModel.js";

const leaveTypeEncashmentModel = sequelize.define(
  "leave_type_encashment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "id",
    },
    leaveTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: "leave_type_id",
      references: {
        model: leaveTypeModel,
        key: "id",
      },
    },
    allowEncashment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "allow_encashment",
    },
    applicableOn: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "applicable_on",
    },
    dsLimitMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "ds_limit_method",
    },
    dsMaxEncashmentDays: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      field: "ds_max_encashment_days",
    },
    dsMinBalanceToRetain: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      field: "ds_min_balance_to_retain",
    },
    dsMinServiceRequirement: {
      type: DataTypes.INTEGER,
      defaultValue: 12,
      field: "ds_min_service_requirement",
    },
    dsEncashmentFrequency: {
      type: DataTypes.STRING(50),
      defaultValue: "Yearly",
      field: "ds_encashment_frequency",
    },
    sepLimitMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "sep_limit_method",
    },
    sepMinServiceRequirement: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "sep_min_service_requirement",
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    tableName: "leave_type_encashment",
    timestamps: true,
    paranoid: true,
  }
);

leaveTypeEncashmentModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default leaveTypeEncashmentModel;
