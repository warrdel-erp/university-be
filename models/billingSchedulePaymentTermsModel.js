import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import billingScheduleItemsModel from "./billingScheduleItemsModel.js";

const billingSchedulePaymentTermsModel = sequelize.define(
  "billing_schedule_payment_terms",
  {
    billingSchedulePaymentTermsId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "billing_schedule_payment_terms_id",
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
    installment: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "installment",
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
    tableName: "billing_schedule_payment_terms",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

billingSchedulePaymentTermsModel.scopeConfig = {
  university: false,
  institute: false,
  academicYear: false,
};

export default billingSchedulePaymentTermsModel;
