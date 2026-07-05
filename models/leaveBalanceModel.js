import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import leavePolicies from "./leavePolicyModel.js";

const leaveBalanceModel = sequelize.define(
  "leave_balance",
  {
    balanceId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "balance_id"
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
                model: users,
                key: 'user_id'
            }
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

leaveBalanceModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default leaveBalanceModel;
