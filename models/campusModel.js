import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import university from "./universityModel.js";
import users from "./userModel.js";

const campusModel = sequelize.define(
    'campus',
    {
        campusId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'campus_id'
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: university,
                key: 'university_id'
            }
        },
        campusName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'campus_name'
        },
        campusCode:{
            type: DataTypes.STRING,
            allowNull: false,
            field: 'campus_code',
        },
        campusType: {
            type: DataTypes.ENUM('Main', 'Regional', 'Satellite'),
            allowNull: true,
            field: 'campus_type',
        },
        addressLine: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'address_line',
        },
        latitude: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        longitude:{
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        administratorName: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'administrator_name',
        },
        administratorContactNumber: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'administrator_contact_number',
        },
        administratorEmail: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'administrator_email',
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
        tableName: 'campus',
        timestamps: true,
        paranoid: true
    }
);

campusModel.scopeConfig = { institute: false, academicYear: false };

export default campusModel;