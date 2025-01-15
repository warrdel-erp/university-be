import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import transportRouteModel from "./transportRouteModel.js";
import vehicleModel from "./vehicleModel.js";

export default sequelize.define(
    'assign_vehicle',
    {
        assignVehicleId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'assign_vehicle_id'
        },
        transportRouteId: {
            type: DataTypes.INTEGER,
            field: 'transport_route_id',
            allowNull: false,
            references: {
                model: transportRouteModel,
                key: 'transport_route_id'
            }
        },
        vehicleId: {
            type: DataTypes.INTEGER,
            field: 'vehicle_id',
            allowNull: false,
            references: {
                model: vehicleModel,
                key: 'vehicle_id'
            }
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
        tableName: 'assign_vehicle',
        timestamps: true,
        paranoid: true
    }
);