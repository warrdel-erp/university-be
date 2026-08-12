import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import feeTypeCategoryModel from "./feeTypeCategoryModel.js";
import { feeTypeLedgerTypes } from "../constant.js";

/** ERD fee type (name, description, amount, category, institute). Physical table is not `fee_type` because that name is used by feeGroup-linked {@link ./feeTypeModel.js}. */
const feeTypeCatalogModel = sequelize.define(
  "fee_type_catalog",
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
        feeTypeCatalogId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "fee_type_catalog_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    ledgerType: {
      type: DataTypes.ENUM(...feeTypeLedgerTypes),
      allowNull: false,
      field: "ledger_type",
    },
    feeTypeCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "fee_type_category_id",
      references: {
        model: feeTypeCategoryModel,
        key: "fee_type_category_id",
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
    tableName: "fee_type_catalog",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

feeTypeCatalogModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default feeTypeCatalogModel;
