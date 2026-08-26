import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";

const assetReturnTransactionModel = sequelize.define(
  "asset_return_transaction",
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
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        assetReturnTransactionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "asset_return_transaction_id",
    },
    returnDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "return_date",
    },
  },
  {
    tableName: "asset_return_transaction",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

assetReturnTransactionModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default assetReturnTransactionModel;
