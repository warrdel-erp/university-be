import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import timeTableNameModel from "./timeTableNameModel.js";
import timeTableCreateModel from "./timeTableCreateModel.js";
import timeTableCreationModel from "./timeTableCreationModel.js";
import teacherSubjectMappingModel from "./teacherSubjectMappingModel.js";
import employeeModel from "./employeeModel.js";
import classRoomModel from "./classRoomModel.js";
import electiveSubjectModel from "./electiveSubjectModel.js";
import subjectModel from "./subjectModel.js";

export default sequelize.define(
    'time_table_mapping',
    {
        timeTableMappingId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'time_table_mapping_id'
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
        timeTableCreateId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'time_table_create_id',
            references: {
                model: timeTableCreateModel,
                key: 'time_table_create_id'
            }
        },
        timeTableCreationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'time_table_creation_id',
            references: {
                model: timeTableCreationModel,
                key: 'time_table_creation_id'
            }
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'employee_id',
            references: {
                model: employeeModel,
                key: 'employee_id'
            }
        },
        electiveSubjectId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'elective_subject_id',
            references: {
                model: electiveSubjectModel,
                key: 'elective_subject_id'
            }
        },
        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'subject_id',
            references: {
                model: subjectModel,
                key: 'subject_id'
            }
        },
        teacherSubjectMappingId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'teacher_subject_mapping_id',
            references: {
                model: teacherSubjectMappingModel,
                key: 'teacher_subject_mapping_id'
            }
        },
        classRoomSectionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'class_room_section_id',
            references: {
                model: classRoomModel,
                key: 'class_room_section_id'
            }
        },
        isSameTeacher:{
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'is_same_teacher'
        },
        day:{
            type: DataTypes.STRING,
            allowNull: false,
        },
        isTeacher:{
            type: DataTypes.STRING,
            allowNull: false,
            field:'is_teacher',
            defaultValue:'Primary'
        },
        isAttendence:{
            type: DataTypes.BOOLEAN,
            allowNull: false,
            field:'is_Attendence',
            defaultValue:true,
        },
        period:{
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        timeTableType: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue :'normal',
            field:'time_table_type'
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
        tableName: 'time_table_mapping',
        timestamps: true,
        paranoid: true
    }
);