import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import university from "./universityModel.js";
import institute from "./instituteModel.js";
import departmentStructure from "./departmentStructureModel.js";
import subAccount from "./subAccountModel.js";

const orgPositionModel = sequelize.define(
    'org_position',
    {
        orgPositionId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'org_position_id'
        },
        departmentStructureId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'department_structure_id',
            references: {
                model: departmentStructure,
                key: 'department_structure_id'
            }
        },
        subAccountId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'sub_account_id',
            references: {
                model: subAccount,
                key: 'sub_account_id'
            }
        },
        positionName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'position_name'
        },
        positionCode: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'position_code'
        },
        employmentCategory: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'employment_category'
        },
        reportsToOrgPositionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'reports_to_org_position_id',
            references: {
                model: 'org_position',
                key: 'org_position_id'
            }
        },
        reportingType: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'reporting_type'
        },
        isVacant: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_vacant'
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'sort_order'
        },
        level: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'level'
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
        tableName: 'org_position',
        timestamps: true,
        paranoid: true
    }
);

orgPositionModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default orgPositionModel;
