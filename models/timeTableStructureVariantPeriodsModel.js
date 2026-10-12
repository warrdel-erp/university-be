import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import timeTableStructureVariantModel from "./timeTableStructureVariantModel.js";
import timeTableStructurePeriodsModel from "./timeTableStructurePeriodsModel.js";

const timeTableStructureVariantPeriodsModel = sequelize.define(
    'time_table_structure_variant_periods',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'id'
        },
        timeTableStructureVariantId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'time_table_structure_variant_id',
            references: {
                model: timeTableStructureVariantModel,
                key: 'time_table_structure_variant_id'
            }
        },
        timeTableStructurePeriodsId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'time_table_structure_periods_id',
            references: {
                model: timeTableStructurePeriodsModel,
                key: 'time_table_creation_id'
            }
        },
        startTime: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'start_time'
        },
        endTime: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'end_time'
        },
        isCourse: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_course'
        },
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
        academicYearId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYearModel,
                key: 'acedmic_year_id'
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
        tableName: 'time_table_structure_variant_periods',
        timestamps: true,
        paranoid: false,
        indexes: [
            {
                unique: true,
                fields: ['time_table_structure_variant_id', 'time_table_structure_periods_id'],
                name: 'uniq_variant_period',
            },
        ],
    }
);

timeTableStructureVariantPeriodsModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default timeTableStructureVariantPeriodsModel;
