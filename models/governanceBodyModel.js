import sequelize from '../database/sequelizeConfig.js';
import { DataTypes } from 'sequelize';
import users from './userModel.js';
import university from './universityModel.js';
import institute from './instituteModel.js';
import { governanceBodyCategories, governanceBodyStatuses } from '../constant.js';

const governanceBodyModel = sequelize.define(
    'governance_body',
    {
        governanceBodyId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'governance_body_id',
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: university,
                key: 'university_id',
            },
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
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        category: {
            type: DataTypes.ENUM(...governanceBodyCategories),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        parentBodyId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'parent_body_id',
        },
        constitutedOn: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'constituted_on',
        },
        effectiveFrom: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'effective_from',
        },
        effectiveTo: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'effective_to',
        },
        status: {
            type: DataTypes.ENUM(...governanceBodyStatuses),
            allowNull: false,
            defaultValue: 'Active',
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'created_by',
            references: {
                model: users,
                key: 'user_id',
            },
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'updated_by',
            references: {
                model: users,
                key: 'user_id',
            },
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'created_at',
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'updated_at',
        },
    },
    {
        tableName: 'governance_body',
        timestamps: true,
    },
);

governanceBodyModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default governanceBodyModel;
