import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import users from "./userModel.js";
import dormitoryList from "./dormitoryListModel.js";
import roomType from "./roomTypeModel.js";

const addDormitoryModel = sequelize.define(
    'add_dormitory',
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
        campusId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'campus_id',
            references: {
                model: 'campus',
                key: 'campus_id'
            }
        },
        dormitoryListId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'add_dormitory_id'
        },
        dormitory: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: dormitoryList,
                key: 'dormitory_list_id'
            }
        },
        roomNumber:{
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'room_number',
        },
        type: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: roomType,
                key: 'room_type_id'
            }
        },
        numberOfBed:{
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'number_of_bed',
        },
        costPerBed:{
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'cost_per_bed',
        },
        description:{
            type: DataTypes.STRING,
            allowNull:true
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
        tableName: 'add_dormitory',
        timestamps: true,
        paranoid: true
    }
);

addDormitoryModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default addDormitoryModel;
