import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import feePolicyModel from "./feePolicyModel.js";

const feePolicySlabsModel = sequelize.define(
  "fee_policy_slabs",
  {
    feePolicySlabId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "fee_policy_slab_id",
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
    feePolicyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "fee_policy_id",
      references: {
        model: feePolicyModel,
        key: "fee_policy_id",
      },
    },
    relativePeriod: {
      type: DataTypes.ENUM("before", "after"),
      allowNull: true,
      field: "relative_period",
    },
    fromUnit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "from_unit",
    },
    toUnit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "to_unit",
    },
    slabValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: "slab_value",
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "order_index",
    },
  },
  {
    tableName: "fee_policy_slabs",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

feePolicySlabsModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default feePolicySlabsModel;
