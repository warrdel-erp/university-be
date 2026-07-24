import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import university from "./universityModel.js";
import institute from "./instituteModel.js";
import orgPosition from "./orgPositionModel.js";

const orgPositionHeadModel = sequelize.define(
    'org_position_head',
    {
        orgPositionHeadId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'org_position_head_id'
        },
        orgPositionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'org_position_id',
            references: {
                model: orgPosition,
                key: 'org_position_id'
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
            type: DataTypes.STRING,
            allowNull: false,
            field: 'holder_type'
        },
        status: {
            type: DataTypes.STRING,
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
        tableName: 'org_position_head',
        timestamps: true,
        paranoid: true
    }
);

orgPositionHeadModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default orgPositionHeadModel;
