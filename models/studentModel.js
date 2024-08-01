import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import university from './universityModel.js';
import campus from './campusModel.js';
import institute from './instituteModel.js';
import affiliatedUniversity from './affiliatedUniversityModel.js';
import courseLevel from './courseLevelModel.js';
import course from './courseModel.js';
import specialization from "./specializationModel.js";
import {additionalCategory, bloodGroup, caste, consultant, counselor, courseMedium, courseOpted, curricularActivity, documentStatus, feeCategory, feePlan, feeSession, gender, iindExam, istExam, nationality, region, registerClass, religion, shift, specializationMinor, studentHouseId, studentAdmissionStatus, country, state, city, studentStatus, formSession, admissionCategory} from '../constant.js'; 

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
        courseLevelId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'course_level_id',
            references: {
                model: courseLevel,
                key: 'course_level_id'
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
        formSession:{
            type: DataTypes.ENUM(...formSession),
            allowNull: true,
            field:'form_session',
        },
        formName:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'form_name'
        },
        formNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'form_number'
        },
        enquiryNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'enquiry_number'
        },
        telephoneNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'telephone_number'
        },
        scholarNumber:{
            type: DataTypes.STRING,
            allowNull: false,
            field:'scholar_number'
        },
        lastScholarNumber:{
            type:DataTypes.STRING,
            allowNull: true,
            field:'last_scholar_number'
        },
        enrollNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'enroll_number',
            // unique:true
        },
        onlineAdmissionNumber:{
            type: DataTypes.INTEGER,
            allowNull: true,
            field:'online_admission_number'
        },
        firstName:{
            type:DataTypes.STRING,
            allowNull: false,
            field:'first_name'
        },
        middleName:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'middle_name',
        },
        lastName:{
            type: DataTypes.STRING,
            allowNull:true,
            field:'last_name'
        },
        bloodGroup:{
            type:DataTypes.ENUM(...bloodGroup),
            allowNull: true,
            field:'blood_group'
        },
        gender:{
            type: DataTypes.ENUM(...gender),
            allowNull: false,
        },
        fatherName:{
            type: DataTypes.STRING,
            allowNull: false,
            field:'father_name'
        },
        annualIncome:{
            type:DataTypes.FLOAT,
            allowNull : true,
            field:'annual_income'
        },
        motherName:{
            type:DataTypes.STRING,
            allowNull : true,
            field:'mother_name'
        },
        consultant:{
            type:DataTypes.ENUM(...consultant),
            allowNull: true,
        },
        studentHouseId:{
            type:DataTypes.ENUM(...studentHouseId),
            allowNull: true,
            field:'student_house_id'
        },
        previousInstitute:{
            type:DataTypes.STRING,
            allowNull: true,
            field:'previous_institute'
        },
        shiftingReason:{
            type:DataTypes.STRING,
            allowNull: true,
            field:'shifting_reason'
        },
        counselor:{
            type:DataTypes.ENUM(...counselor),
            allowNull: true,
        },
        courseMedium:{
            type:DataTypes.ENUM(...courseMedium),
            allowNull: true,
            field:'course_medium'
        },
        specializationMinor:{
            type:DataTypes.ENUM(...specializationMinor),
            allowNull: true,
            field:'specialization_minor'
        },
        registerClass:{
            type:DataTypes.ENUM(...registerClass),
            allowNull: false,
            field:'register_class'
        },
        specializationReason:{
            type:DataTypes.STRING,
            allowNull: true,
            field:'specialization_reason'
        },
        courseOpted:{
            type:DataTypes.ENUM(...courseOpted),
            allowNull: true,
            field:'course_opted'
        },
        eligibityCriteria:{
            type:DataTypes.STRING,
            allowNull: true,
            field:'eligibity_criteria'
        },
        totalSeat:{
            type:DataTypes.INTEGER,
            allowNull: true,
            field:'total_seat'
        },
        remainingSeat:{
            type:DataTypes.INTEGER,
            allowNull: true,
            field:'remaining_seat'
        },
        totalSeatCategory:{
            type:DataTypes.INTEGER,
            allowNull: true,
            field:'total_seat_category'
        },
        remainingSeatCategory:{
            type:DataTypes.INTEGER,
            allowNull: true,
            field:'remaining_seat_category'
        },
        feeSession:{
            type:DataTypes.ENUM(...feeSession),
            allowNull: false,
            field:'fee_session'
        },
        feeCategory:{
            type:DataTypes.ENUM(...feeCategory),
            allowNull: true,
            field:'fee_category'
        },
        feePlan:{
            type:DataTypes.ENUM(...feePlan),
            allowNull: false,
            field:'fee_plan'
        },
        advanceReceived:{
            type:DataTypes.FLOAT,
            allowNull: true,
            field:'advance_received'
        },
        caste:{
            type:DataTypes.ENUM(...caste),
            allowNull: false,
        },
        religion:{
            type:DataTypes.ENUM(...religion),
            allowNull: false,
        },
        additionalCategory:{
            type:DataTypes.ENUM(...additionalCategory),
            allowNull: true,
            field:'additional_category'
        },
        curricularActivity:{
            type:DataTypes.ENUM(...curricularActivity),
            allowNull: true,
            field:'curricular_activity'
        },
        istExamCenter:{
            type:DataTypes.ENUM(...istExam),
            allowNull: true,
            field:'ist_exam_center'
        },
        iindExamCenter:{
            type:DataTypes.ENUM(...iindExam),
            allowNull: true,
            field:'iind_exam_center'
        },
        region:{
            type:DataTypes.ENUM(...region),
            allowNull: true,
        },
        birthDate:{
            type:DataTypes.DATE,
            allowNull: false,
            field:'birth_date'
        },
        admissionCategory:{
            type:DataTypes.ENUM(...admissionCategory),
            allowNull: false,
            field:'admission_category'
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
		employeeReferences:{
			type:DataTypes.STRING,
			allowNull:true,
            field:'employee_references'
		},
		studentReferences:{
			type:DataTypes.STRING,
			allowNull:true,
            field:'student_references'
		},
		payOut:{
			type:DataTypes.STRING,
			allowNull:true,
            field:'pay_out'
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
			type:DataTypes.STRING,
			allowNull:false,
            field:'phone_number'
		},
        mobileNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'mobile_number'
        },
        email:{
            type: DataTypes.STRING,
            allowNull: false,
        },
        panNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'pan_number'
        },
        parentEmail:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'parent_email'
        },
        parentNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'parent_number'
        },
        aadharNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'aadhar_number'
        },
        placeOfBirth:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'place_of_birth'
        },
        nationality:{
            type:DataTypes.ENUM(...nationality),
            allowNull: true,
        },
        multipleNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'multiple_number'
        },
        registerFileNumber:{
			type:DataTypes.STRING,
			allowNull:false,
            field:'register_file_number'
		},
        shift:{
            type: DataTypes.ENUM(...shift),
            allowNull: true,
        },
        whatsappNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'whatsapp_number'
        },
        studentNameAlias:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'student_name_alias'
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
            type:DataTypes.STRING,
            allowNull:true,
            field:'cancel_reason'
        },
        generalRemark:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'general_remark'
        },
        preference:{
            type:DataTypes.STRING,
            allowNull:true,
        },
        documentStatus:{
            type: DataTypes.ENUM(...documentStatus),
            allowNull: true,
            defaultValue: 'Pending Documents',
            field:'document_status',
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
        },
    },
    {
        tableName: 'students',
        timestamps: true,
        paranoid: true
    }
);