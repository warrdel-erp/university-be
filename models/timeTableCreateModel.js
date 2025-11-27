import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import campusModel from "./campusModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import courseModel from "./courseModel.js";
import classSectionModel from "./classSectionModel.js";
import users from "./userModel.js";
import timeTableNameModel from "./timeTableNameModel.js";

export default sequelize.define(
    'time_table_create',
    {
        timeTableCreateId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'time_table_create_id'
        },
        timeTableNameId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'time_table_name_id',
            references: {
                model: timeTableNameModel,
                key: 'time_table_name_id'
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
            allowNull: true,
            field: 'class_sections_id',
            references: {
                model: classSectionModel,
                key: 'class_sections_id'
            }
        },
        isPublish :{
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field:'is_publish'
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
            defaultValue :'normal',
            field:'time_table_type'
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