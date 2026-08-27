import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import users from "./userModel.js";
import instituteModel from "./instituteModel.js";

const vehicleModel = sequelize.define(
    'transport_vehicle',
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
        userId: {
            type: DataTypes.INTEGER,
            field: 'user_id',
            allowNull: false,
            references: {
                model: users,
                key: 'user_id'
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
        campusId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'campus_id',
            references: {
                model: 'campus',
                key: 'campus_id'
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

vehicleModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default vehicleModel;
