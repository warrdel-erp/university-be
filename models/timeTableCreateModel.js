import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import timeTableCreation from "./timeTableCreationModel.js";
// import teacherSubjectMapping from "./teacherSubjectMappingModel.js";
// import teacherSectionMapping from "./teacherSectionMappingModel.js";
import campusModel from "./campusModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import courseModel from "./courseModel.js";
import classSectionModel from "./classSectionModel.js";
import users from "./userModel.js";

export default sequelize.define(
    'time_table_create',
    {
        timeTableCreateId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'time_table_create_id'
        },
        timeTableCreationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'time_table_creation_id',
            references: {
                model: timeTableCreation,
                key: 'time_table_creation_id'
            }
        },
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'course_id',
            references: {
                model: courseModel,
                key: 'course_id'
            }
        },
        acedmicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYearModel,
                key: 'acedmic_year_id'
            }
        },
        classSectionsId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'class_sections_id',
            references: {
                model: classSectionModel,
                key: 'class_sections_id'
            }
        },
        // teacherSubjectMappingId: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        //     field: 'teacher_subject_mapping_id',
        //     references: {
        //         model: teacherSubjectMapping,
        //         key: 'teacher_subject_mapping_id'
        //     }
        // },
        // teacherSectionMappingId: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        //     field: 'teacher_section_mapping_id',
        //     references: {
        //         model: teacherSectionMapping,
        //         key: 'teacher_section_mapping_id'
        //     }
        // },
        // day:{
        //     type: DataTypes.STRING,
        //     allowNull: false,
        // },
        // period:{
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        // },
        campusId: 
        {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'campus_id',
            references: {
                 model: campusModel,
                 key: 'campus_id'
            }
        },
        startingDate: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'starting_date'
        },
        endingDate: {
            type: DataTypes.DATE,
            allowNull: false,
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
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: 'time_table_create',
        timestamps: true,
        paranoid: true
    }
);