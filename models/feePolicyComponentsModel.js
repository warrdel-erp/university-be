import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import feePolicyModel from "./feePolicyModel.js";
import feeTypeCatalogModel from "./feeTypeCatalogModel.js";

const feePolicyComponentsModel = sequelize.define(
  "fee_policy_components",
  {
    feePolicyComponentId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "fee_policy_component_id",
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
    feeTypeCatalogId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "fee_type_catalog_id",
      references: {
        model: feeTypeCatalogModel,
        key: "fee_type_catalog_id",
      },
    },
  },
  {
    tableName: "fee_policy_components",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

feePolicyComponentsModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default feePolicyComponentsModel;
