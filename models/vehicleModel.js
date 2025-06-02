import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import employee from './employeeModel.js'
import instituteModel from "./instituteModel.js";

export default sequelize.define(
    'transport_vehicle',
    {
        vehicleId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'vehicle_id'
        },
        vehicleNumber: {
            type: DataTypes.STRING,
            field: 'vehicle_number',
            allowNull: false
        },
        vehicleModel: {
            type: DataTypes.STRING,
            field: 'vehicle_model',
            allowNull: false
        },
        madeYear: {
            type: DataTypes.STRING,
            field: 'made_year',
            allowNull: false
        },
        employeeId: {
            type: DataTypes.INTEGER,
            field: 'employee_id',
            allowNull: false,
            references: {
                model: employee,
                key: 'employee_id'
            }
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        note: {
            type: DataTypes.STRING,
            field: 'note',
            allowNull: true
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
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'updated_by',
            references: {
                model: users,
                key: 'user_id'
            }
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
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        }
    },
    {
        tableName: 'transport_vehicle',
        timestamps: true,
        paranoid: true
    }
);