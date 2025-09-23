import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import leavePolicies from "./leavePolicyModel.js";
import employeeModel from "./employeeModel.js";

export default sequelize.define(
  "leave_balance",
  {
    balanceId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "balance_id"
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "employee_id",
      references: {
         model: employeeModel, 
         key: "employee_id" }
    },
    policyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "policy_id",
      references: { model: leavePolicies, key: "policy_id" }
    },
    year: { type: DataTypes.INTEGER, allowNull: false },
    totalAllocated: { type: DataTypes.INTEGER, allowNull: false, field: "total_allocated" },
    usedLeaves: { type: DataTypes.INTEGER, defaultValue: 0, field: "used_leaves" },
    remainingLeaves: { type: DataTypes.INTEGER, allowNull: false, field: "remaining_leaves" }
  },
  { tableName: "leave_balance", timestamps: false }
);