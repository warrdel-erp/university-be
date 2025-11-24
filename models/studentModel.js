import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import university from './universityModel.js';
import campus from './campusModel.js';
import institute from './instituteModel.js';
import affiliatedUniversity from './affiliatedUniversityModel.js';
import course from './courseModel.js';
import specialization from "./specializationModel.js";
import { documentStatus, studentAdmissionStatus, studentStatus} from '../constant.js'; 
import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";
import users from "./userModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import sessionModel from "./sessionModel.js";
import semesterModel from "./semesterModel.js";
import classSectionModel from "./classSectionModel.js";
import feePlanModel from "./feePlanModel.js";

export default sequelize.define(
    'students',
    {
        studentId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'student_id'
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
        campusId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'campus_id',
            references: {
                model: campus,
                key: 'campus_id'
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
        affiliatedUniversityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'affiliated_university_id',
            references: {
                model: affiliatedUniversity,
                key: 'affiliated_university_id'
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
        courseLevelId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'course_level_id',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'course_id',
            references: {
                model: course,
                key: 'course_id'
            }
        },
        specializationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'specialization_id',
            references: {
                model: specialization,
                key: 'specialization_id'
            }
        },
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'session_id',
            references: {
                model: sessionModel,
                key: 'session_id'
            }
        },
        semesterId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'semester_id',
            references: {
                model: semesterModel,
                key: 'semester_id'
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
        feePlanId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'fee_plan_id',
            references: {
                model: feePlanModel,
                key: 'fee_plan_id'
            }
        },
        scholarNumber:{
            type: DataTypes.STRING(150),
            allowNull: false,
            field:'scholar_number'
        },
        enrollNumber:{
            type: DataTypes.STRING(50),
            allowNull: true,
            field:'enroll_number',
            // unique:true
        },
        firstName:{
            type:DataTypes.STRING(100),
            allowNull: false,
            field:'first_name'
        },
        middleName:{
            type: DataTypes.STRING(100),
            allowNull: true,
            field:'middle_name',
        },
        lastName:{
            type: DataTypes.STRING(100),
            allowNull:true,
            field:'last_name'
        },
        fatherName:{
            type: DataTypes.STRING(150),
            allowNull: false,
            field:'father_name'
        },
        annualIncome:{
            type:DataTypes.FLOAT,
            allowNull : true,
            field:'annual_income'
        },
        motherName:{
            type:DataTypes.STRING(150),
            allowNull : true,
            field:'mother_name'
        },
        birthDate:{
            type:DataTypes.DATE,
            allowNull: false,
            field:'birth_date'
        },
        admisssionDate:{
            type:DataTypes.DATE,
            allowNull: true,
            field:'admission_date'
        },
        enrollDate:{
            type:DataTypes.DATE,
            allowNull: true,
            field:'enroll_date'
        },
        studentAdmissionStatus:{
			type:DataTypes.ENUM(...studentAdmissionStatus),
			allowNull:true,
            field:'student_admission_status'
		},
		currentClass:{
			type:DataTypes.STRING,
			allowNull:true,
            field:'current_class'
		},
		studentPhoto:{
			type:DataTypes.JSON,
			allowNull:true,
            field:'student_photo'
		},
        signature:{
			type:DataTypes.JSON,
			allowNull:true,
		},
        phoneNumber:{
			type:DataTypes.STRING(50),
			allowNull:false,
            field:'phone_number'
		},
        mobileNumber:{
            type: DataTypes.STRING(50),
            allowNull: true,
            field:'mobile_number'
        },
        email:{
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        parentEmail:{
            type: DataTypes.STRING(100),
            allowNull: true,
            field:'parent_email'
        },
        parentNumber:{
            type: DataTypes.STRING(50),
            allowNull: true,
            field:'parent_number'
        },
        aadharNumber:{
            type: DataTypes.STRING(100),
            allowNull: true,
            field:'aadhar_number'
        },
        panNumber:{
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'pan_number'
        },
        AdditionalNotes:{
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'additional_notes'
        },
        bankName:{
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'bank_name'
        },
        accountNumber:{
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'account_number'
        },
        ifscCode:{
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'ifsc_code'
        },
        placeOfBirth:{
            type: DataTypes.TEXT,
            allowNull: true,
            field:'place_of_birth'
        },
        studentStatus:{
            type:DataTypes.ENUM(...studentStatus),
            allowNull:true,
            field:'student_status'
        },
        cancelDate:{
            type:DataTypes.DATE,
            allowNull:true,
            field:'cancel_date'
        },
        cancelReason:{
            type:DataTypes.TEXT,
            allowNull:true,
            field:'cancel_reason'
        },
        generalRemark:{
            type:DataTypes.TEXT,
            allowNull:true,
            field:'general_remark'
        },
        preference:{
            type:DataTypes.TEXT,
            allowNull:true,
        },
        documentStatus:{
            type: DataTypes.ENUM(...documentStatus),
            allowNull: true,
            defaultValue: 'Pending Documents',
            field:'document_status',
        },
        feeStatus:{
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field:'fee_status',
        },
        pAddress:{
            type: DataTypes.TEXT,
            allowNull: true,
            field:'p_address'
        },
        pPincode:{
			type:DataTypes.INTEGER,
			allowNull:true,
            field:'p_pincode'
		},
        pCountry: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'p_country',
        },
        pState: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'p_state',
        },
        pCity: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'p_city',
        },
        contact:{
            type:DataTypes.STRING(100),
            allowNull:true
        },
        cAddress:{
            type: DataTypes.TEXT,
            allowNull: true,
            field:'c_address'
        },
        cPincode:{
			type:DataTypes.INTEGER,
			allowNull:true,
            field:'c_pincode'
		},
        cCountry: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'c_country',
        },
        cState: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'c_state',
        },
        cCity: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'c_city',
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
        tableName: 'students',
        timestamps: true,
        paranoid: true
    }
);