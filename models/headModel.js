import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import campus from "./campusModel.js";
import institute from "./instituteModel.js";
import university from "./universityModel.js";

export default sequelize.define(
    'head',
    {
        headId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'head_id'
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
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: university,
                key: 'university_id'
            }
        },
        headName: {
            type: DataTypes.STRING,
            field: 'head_name',
            allowNull: false,
        },
        designation: {
            type: DataTypes.STRING,
            allowNull: false
        },
        mobileNumber: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'mobile_number',
        },
        alternateNumber: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'alternate_number',
        },
        registerEmail: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'register_email',
        },
        alternateEmail: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'alternate_email',
        },
        address: {
            type: DataTypes.STRING,
            allowNull: true
        },
        university: {
            type: DataTypes.STRING,
            allowNull: true
        },
        typeOfInstitute: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'type_of_institute',
        },
        location: {
            type: DataTypes.STRING,
            allowNull: true
        },
        financialStatus: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'financial_status',
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
        tableName: 'head',
        timestamps: true,
        paranoid: true
    }
);