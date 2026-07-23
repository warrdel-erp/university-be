import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import university from "./universityModel.js";
import institute from "./instituteModel.js";
import { departmentTypes } from "../constant.js";

const departmentModel = sequelize.define(
    'department',
    {
        departmentId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'department_id'
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
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: institute,
                key: 'institute_id',
            },
        },
        departmentName: {
            type: DataTypes.STRING,
            field: 'department_name',
            allowNull: false,
        },
        alternateName: {
            type: DataTypes.STRING,
            field: 'alternate_name',
            allowNull: true,
        },
        departmentCode: {
            type: DataTypes.STRING,
            field: 'department_code',
            allowNull: true,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
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
    },
    {
        tableName: 'department',
        timestamps: true,
        paranoid: false
    }
);

departmentModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default departmentModel;
