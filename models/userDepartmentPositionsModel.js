import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import university from "./universityModel.js";
import institute from "./instituteModel.js";
import departmentPositions from "./departmentPositionsModel.js";
import {
    departmentPositionHolderTypes,
    departmentPositionHeadStatuses,
} from "../constant.js";

const userDepartmentPositionsModel = sequelize.define(
    'user_department_positions',
    {
        userDepartmentPositionId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'user_department_position_id'
        },
        departmentPositionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'department_position_id',
            references: {
                model: departmentPositions,
                key: 'department_position_id'
            }
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id',
            references: {
                model: users,
                key: 'user_id'
            }
        },
        holderType: {
            type: DataTypes.ENUM(...departmentPositionHolderTypes),
            allowNull: false,
            field: 'holder_type'
        },
        status: {
            type: DataTypes.ENUM(...departmentPositionHeadStatuses),
            allowNull: false,
            defaultValue: 'ACTIVE',
            field: 'status'
        },
        joiningDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'joining_date'
        },
        endDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'end_date'
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
                key: 'institute_id'
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
        tableName: 'user_department_positions',
        timestamps: true,
        paranoid: true
    }
);

userDepartmentPositionsModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default userDepartmentPositionsModel;
