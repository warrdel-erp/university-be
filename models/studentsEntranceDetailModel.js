import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import student from "./studentModel.js";
import users from "./userModel.js"

const studentsEntranceDetailModel = sequelize.define(
    'students_entrance_detail',
    {
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
        studentsEntranceDetailId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'students_entrance_detail_id'
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'student_id',
            references: {
                model: student,
                key: 'student_id'
            }
        },
        entranceExam:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'entrance_exam'
        },
        allotmentList:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'allotment_list'
        },
        allotmentCategory:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'allotment_category'
        },
        categoryRank:{
            type:DataTypes.INTEGER,
            allowNull:true,
            field:'category_rank'
        },
        rollNumber:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'roll_number'
        },
        marks:{
            type:DataTypes.FLOAT,
            allowNull:true,
        },
        percentile:{
            type:DataTypes.FLOAT,
            allowNull:true,
        },
        applicationId:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'application_id'
        },
        counselingPlace:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'counseling_place'
        },
        counselingDate:{
            type:DataTypes.DATE,
            allowNull:true,
            field:'counseling_date'
        },
        remarks:{
            type:DataTypes.STRING,
            allowNull:true,
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
        // updatedBy: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        //     field: 'updated_by',
        //     references: {
        //         model: users,
        //         key: 'user_id'
        //     }
        // },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: 'students_entrance_detail',
        timestamps: true,
        paranoid: true
    }
);

studentsEntranceDetailModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default studentsEntranceDetailModel;
