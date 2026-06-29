import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import campus from "./campusModel.js";
import institute from "./instituteModel.js";
import { buildingTypes } from "../constant.js";

const buildingModel = sequelize.define(
    'building',
    {
        buildingId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'building_id'
        },
        campusId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'campus_id',
            references: {
                model: campus,
                key: 'campus_id'
            }
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: institute,
                key: 'institute_id'
            }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        buildingType: {
            type: DataTypes.ENUM(...buildingTypes),
            allowNull: false,
            field: 'building_type',
        },
        description: {
            type: DataTypes.STRING,
            allowNull:true
        },
        openingTime:{
            type: DataTypes.TIME,
            allowNull:true,
            field:'opening_time'
        },
        closingTime:{
            type: DataTypes.TIME,
            allowNull:true,
            field:'closing_time'
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
        tableName: 'building',
        timestamps: true,
        paranoid: true
    }
);

buildingModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default buildingModel;
