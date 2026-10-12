import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import timeTableStructureCourseModel from "./timeTableStructureCourseModel.js";
import timeTableStructureVariantModel from "./timeTableStructureVariantModel.js";

const timeTableStructureVariantCourseMappingModel = sequelize.define(
    'time_table_structure_variant_course_mapping',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'id'
        },
        timetableStructureCourseMapperId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'timetable_structure_course_mapper_id',
            references: {
                model: timeTableStructureCourseModel,
                key: 'timetable_structure_course_mapper_id'
            }
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
        name: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'name'
        },
        startingDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'starting_date'
        },
        endingDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'ending_date'
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
        tableName: 'time_table_structure_variant_course_mapping',
        timestamps: true,
        paranoid: false,
    }
);

timeTableStructureVariantCourseMappingModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default timeTableStructureVariantCourseMappingModel;
