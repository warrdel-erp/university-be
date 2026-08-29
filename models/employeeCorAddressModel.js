import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import employee from "./employeeModel.js";
import users from "./userModel.js";

const employeeCorAddressModel = sequelize.define(
    'employee_cor_address',
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
                model: users,
                key: 'user_id'
            }
        },
        cCountry: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'c_country',
        },
        cState: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'c_state',
        },
        cCity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'c_city',
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

employeeCorAddressModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default employeeCorAddressModel;
