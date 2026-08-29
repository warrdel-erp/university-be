import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import campusModel from "./campusModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import courseModel from "./courseModel.js";
import classSectionTermModel from "./classSectionTermModel.js";
import users from "./userModel.js";
import timeTableStructureCourseModel from "./timeTableStructureCourseModel.js";
import academicGroupModel from "./academicGroupModel.js";
import universityModel from "./universityModel.js";

const timeTableRoutineModel = sequelize.define(
    'time_table_routine',
    {
        timeTableRoutineId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'time_table_routine_id'
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
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'course_id',
            references: {
                model: courseModel,
                key: 'course_id'
            }
        },
        academicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYearModel,
                key: 'acedmic_year_id'
            }
        },
        classSectionTermId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'class_section_term_id',
            references: {
                model: classSectionTermModel,
                key: 'class_section_term_id'
            }
        },
        academicGroupId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'academic_group_id',
            references: {
                model: academicGroupModel,
                key: 'academic_group_id'
            }
        },
        isPublish: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'is_publish'
        },
        campusId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'campus_id',
            references: {
                model: campusModel,
                key: 'campus_id'
            }
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
        timeTableType: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'normal',
            field: 'time_table_type'
        },
        startingDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'starting_date'
        },
        endingDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'ending_date'
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
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'updated_by',
            references: {
                model: users,
                key: 'user_id'
            }
        },
        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'department_id',
            references: {
                model: 'department',
                key: 'department_id'
            }
        },
    },
    {
        tableName: 'time_table_routine',
        timestamps: true,
        paranoid: false,
    }
);

timeTableRoutineModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default timeTableRoutineModel;
