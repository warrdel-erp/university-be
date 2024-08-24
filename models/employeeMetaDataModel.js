import sequelize from "../database/sequelizeConfig.js"
import { DataTypes } from 'sequelize';
import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";
import employeeCodeMaster from "./employeeCodeMasterModel.js";
import employee from "./employeeModel.js";

export default sequelize.define(
  'employee_meta_data',
  {
    employeeMetaDataId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'employee_meta_data_id'
    },
    types: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'types',
        references: {
            model: employeeCodeMasterType,
            key: 'employee_code_master_type_id'
        }
    },
    codes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'codes',
        references: {
            model: employeeCodeMaster,
            key: 'employee_code_master_id'
        }
    },
    employeeId: { 
        type: DataTypes.INTEGER,
        allowNull:false,
        field: 'employee_id',
        references:{
            model :employee,
            key:'employee_id'
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field:'created_at',
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field:'updated_at',
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at'
    },
},  
{
    tableName: 'employee_meta_data',
    timestamps: true,
    paranoid:true,
    indexes: [
        {
          unique: true,
          fields: ['employee_id', 'types', 'codes']
        }
    ]
},
);