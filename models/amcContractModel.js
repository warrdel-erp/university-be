import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import amcVendorModel from "./amcVendorModel.js";

const amcContractModel = sequelize.define(
  "amc_contract",
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
        amcContractId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "amc_contract_id",
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
    contractNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "contract_number",
    },
    contractName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "contract_name",
    },
    approvalStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "DRAFT",
      field: "approval_status",
    },
    amcVendorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "amc_vendor_id",
      references: {
        model: amcVendorModel,
        key: "amc_vendor_id",
      },
    },
    contractType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "contract_type",
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date",
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "end_date",
    },
    contractValue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: "contract_value",
    },
    paymentTerms: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "payment_terms",
    },
    serviceVisitFrequency: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "service_visit_frequency",
    },
    slaResponseHours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "sla_response_hours",
    },
    slaResolutionHours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "sla_resolution_hours",
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "amc_contract",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

amcContractModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default amcContractModel;
