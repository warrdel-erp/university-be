import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import feeTypeCatalogModel from "./feeTypeCatalogModel.js";
import feePlanItemModel from "./feePlanItemModel.js";
import instituteModel from "./instituteModel.js";

const feePlanSubItemsModel = sequelize.define(
  "fee_plan_sub_items",
  {
    feePlanSubitemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "fee_plan_sub_item_id",
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    isMainSubItem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_main_sub_item",
    },
    feeTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "fee_type_catalog_id",
      references: {
        model: feeTypeCatalogModel,
        key: "fee_type_catalog_id",
      },
    },
    feePlanItemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "fee_plan_item_id",
      references: {
        model: feePlanItemModel,
        key: "fee_plan_item_id",
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
    tableName: "fee_plan_sub_items",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

feePlanSubItemsModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default feePlanSubItemsModel;
