import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js";
import users from "./userModel.js";
import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";

export default sequelize.define(
    'employee_cor_address',
    {
        employeeCorAddressId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'employee_cor_address_id'
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'employee_id',
            references: {
                model: employee,
                key: 'employee_id'
            }
        },
        cCountry: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'c_country',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        cState: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'c_state',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        cCity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'c_city',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        address:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        pincode:{
			type:DataTypes.INTEGER,
			allowNull:true,
		},
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'updated_at'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'created_by',
            references: {
                model: users,
                key: 'user_id'
            }
        },
        // updatedBy: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        //     field: 'updated_by',
        //     references: {
        //         model: users,
        //         key: 'user_id'
        //     }
        // },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: 'employee_cor_address',
        timestamps: true,
        paranoid: true
    }
);