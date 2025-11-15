import settingModel from './settingModel.js';
import universityModel from './universityModel.js';
import campusModel from './campusModel.js';
import instituteModel from './instituteModel.js';
import affiliatedIniversityModel from './affiliatedUniversityModel.js';
import courseModel from './courseModel.js';
import studentModel from './studentModel.js';
import specializationModel from './specializationModel.js';
import semesterModel from './semesterModel.js';
import subjectModel from './subjectModel.js';
import studentsEntranceDetail from './studentsEntranceDetailModel.js';
import studentsAddress from './studentsAddressModel.js';
import studentCorsAddressModel from './studentCorsAddressModel.js';
import subjectMapperModel from './subjectMapperModel.js';
import employeeCodeMaster from './employeeCodeMasterModel.js';
import employeeCodeMasterType from './employeeCodeMasterTypeModel.js';
import classSectionModel from './classSectionModel.js';
import classSubjectMapperModel from './classSubjectMapperModel.js';
import classStudentMapperModel from './classSectionStudentMapperModel.js';
import studentElectiveSubjectModel from './studentElectiveSubjectModel.js';
import studentMetaData from './studentMetaData.js';
import userModel from './userModel.js';
import employeeModel from './employeeModel.js';
import employeeAddressModel from './employeeAddressModel.js';
import employeeCorAddressModel from './employeeCorAddressModel.js';
import employeeOfficeModel from './employeeOfficeModel.js';
import emplopeeRoleModel from './employeeRoleModel.js';
import employeeSkillModel from './employeeSkill.js';
import employeeDocumentsModel from './employeeDocumentsModel.js';
import employeeQualificationModel from './employeeQualificationModel.js';
import employeeExperianceModel from './employeeExperianceModel.js';
import employeeAchievementModel from './employeeAchievement.js';
import employeeWardModel from './employeeWardModel.js';
import employeeActivityModel from './employeeActivityModel.js';
import employeeReferenceModel from './employeeReferenceModel.js';
import employeeResearchModel from './employeeResearchModel.js';
import employeeLongLeaveModel from './employeeLongLeaveModel.js';
import employeeMetaDataModel from './employeeMetaDataModel.js';
import employeeFilesModel from './employeeFilesModel.js';
import teacherSubjectMappingModel from './teacherSubjectMappingModel.js';
import teacherSectionMappingModel from './teacherSectionMappingModel.js';
import libraryCreationModel from './libraryCreationModel.js';
import libraryAuthorityModel from './libraryAuthorityModel.js';
import libraryAddItemModel from './libraryAddItemModel.js';
import libraryMemberModel from './libraryMemberModel.js';
import libraryIssueBookModel from './libraryIssueBookModel.js';
import libraryAuthorDetailsModel from './libraryAuthorDetailsModel.js';
import libraryMultipleBookDetailsModel from './libraryMultipleBookDetailsModel.js';
import timeTableNameModel from './timeTableNameModel.js';
import timeTableCreationModel from './timeTableCreationModel.js';
import faculityLoadModel from './faculityLoadModel.js';
import timeTableCreateModel from './timeTableCreateModel.js';
import timeTableMappingModel from './timeTableMappingModel.js'
import attendanceModel from './attendanceModel.js';
import classRoomModel from './classRoomModel.js';
import feeGroupModel from './feeGroupModel.js';
import feeTypeModel from './feeTypeModel.js';
import feeInvoiceModel from './feeInvoiceModel.js';
import feeInvoiceDetailModel from './feeInvoiceDetailModel.js';
import userStudentEmployeeModel from './userStudentEmployeeModel.js';
import roleModel from './roleModel.js';
import permissionModel from './permissionModel.js';
import rolePermissionMappingModel from './rolePermissionMappingModel.js';
import userRolePermissionModel from './userRolePermissionModel.js';
import roomTypeModel from './roomTypeModel.js';
import dormitoryListModel from './dormitoryListModel.js';
import addDormitoryModel from './addDormitoryModel.js';
import examTypeModel from './examTypeModel.js';
import examSetupModel from './examSetupModel.js';
import examAttendanceModel from './examAttendanceModel.js';
import transportRouteModel from './transportRouteModel.js';
import vehicleModel from './vehicleModel.js';
import assignVehicleModel from './assignVehicleModel.js';
import acedmicYearModel from './acedmicYearModel.js';
import sectionModel from './sectionModel.js';
import classModel from './classModel.js';
import holidayModel from './holidayModel.js';
import electiveSubjectModel from './electiveSubjectModel.js';
import buildingModel from './buildingModel.js';
import floorModel from './floorModel.js';
import headModel from './headModel.js';
import accountModel from './accountModel.js';
import subAccountModel from './subAccountModel.js';
import departmentModel from './departmentModel.js';
import staffModel from './staffModel.js';
import departmentStructureModel from './departmentStructureModel.js';
import syllabusDetailsModel from './syllabusDetailsModel.js';
import syllabusModel from './syllabusModel.js';
import sessionModel from './sessionModel.js';
import sessionCouseMappingModel from './sessionCouseMappingModel.js';
import poModel from './poModel.js';
import coModel from './coModel.js';
import coWeightageModel from './coWeightageModel.js';
import feePlanModel from './feePlanModel.js';
import feePlanTypeModel from './feePlanTypeModel.js';
import feePlanSemesterModel from './feePlanSemesterModel.js';
import feeInvoiceDetailRecordModel from './feeInvoiceDetailRecordModel.js';
import feeNewInvoiceModel from './feeNewInvoiceModel.js';
import studentInvoiceMapperModel from './studentInvoiceMapperModel.js';
import lessonModel from './lessonModel.js';
import topicModel from './topicModel.js';
import subTopicModel from './subTopicModel.js';
import lessonMappingModel from './lessonMappingModel.js';
import noticeModel from './noticeModel.js';
import examStructureModel from './examStructureModel.js';
import syllabusUnitModel from './syllabusUnitModel.js';
import examSetupTypeModel from './examSetupTypeModel.js';
import scheduleModel from './scheduleModel.js';
import scheduleAssignModel from './ScheduleAssignModel.js';
import teacherAttendeceModel from './teacherAttendenceModel.js';
import leavePolicyModel from './leavePolicyModel.js';
import leaveBalanceModel from './leaveBalanceModel.js';
import leaveRequestModel from './leaveRequestModel.js'; 
import examStructureScheduleMappingModel from './examStructureScheduleMappingModel.js';
import examScheduleModel from './examScheduleModel.js';

studentModel.belongsTo(campusModel, { foreignKey: 'campus_id', as: 'campus' });
campusModel.hasMany(studentModel, { foreignKey: 'campus_id', as: 'campus' });

studentModel.belongsTo(acedmicYearModel, { foreignKey: 'acedmic_year_id', as: 'acdemicYear' });
acedmicYearModel.hasMany(studentModel, { foreignKey: 'acedmic_year_id', as: 'acdemicyear' });

studentModel.belongsTo(instituteModel, { foreignKey: 'institute_id', as: 'institute' });
instituteModel.hasMany(studentModel, { foreignKey: 'institute_id', as: 'institute' });

studentModel.belongsTo(affiliatedIniversityModel, { foreignKey: 'affiliated_university_id', as: 'affiliatedUniversity' });
affiliatedIniversityModel.hasMany(studentModel, { foreignKey: 'affiliated_university_id', as: 'affiliatedUniversity' });

studentModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'course' });
courseModel.hasMany(studentModel, { foreignKey: 'course_id', as: 'course' });

studentModel.belongsTo(classSectionModel, { foreignKey: 'class_sections_id', as: 'studentSections' });
classSectionModel.hasMany(studentModel, { foreignKey: 'class_sections_id', as: 'studentSections' });

studentModel.belongsTo(semesterModel, { foreignKey: 'semester_id', as: 'studentSemester' });
semesterModel.hasMany(studentModel, { foreignKey: 'semester_id', as: 'studentSemester' });

studentModel.belongsTo(sessionModel, { foreignKey: 'session_id', as: 'studentSession' });
sessionModel.hasMany(studentModel, { foreignKey: 'session_id', as: 'studentSession' });

studentModel.belongsTo(specializationModel, { foreignKey: 'specialization_id', as: 'specialization' });
specializationModel.hasMany(studentModel, { foreignKey: 'specialization_id', as: 'specialization' });

studentModel.belongsTo(employeeCodeMasterType, { foreignKey: 'course_level_id', as: 'courseLevel' });
employeeCodeMasterType.hasMany(studentModel, { foreignKey: 'course_level_id', as: 'courseLevel' });

studentModel.belongsTo(feePlanModel, { foreignKey: 'fee_plan_id', as: 'studentFeePlan' });
feePlanModel.hasMany(studentModel, { foreignKey: 'fee_plan_id', as: 'studentFeePlan' });

userStudentEmployeeModel.belongsTo(studentModel, { foreignKey: 'student_id', as: 'student' })
studentModel.hasOne(userStudentEmployeeModel, { foreignKey: 'student_id', as: 'student' })

studentMetaData.belongsTo(employeeCodeMasterType, { foreignKey: 'types', as: 'typs' });
employeeCodeMasterType.hasMany(studentMetaData, { foreignKey: 'types', as: 'typs' });

// class section join 

classSectionModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'courseSection' });
courseModel.hasMany(classSectionModel, { foreignKey: 'course_id', as: 'courseSection' });

classSectionModel.belongsTo(semesterModel, { foreignKey: 'semester_id', as: 'semesterDetail' });
semesterModel.hasMany(classSectionModel, { foreignKey: 'semester_id', as: 'semesterDetail' });

classSectionModel.belongsTo(classModel, { foreignKey: 'class_id', as: 'classGroup' });
classModel.hasMany(classSectionModel, { foreignKey: 'class_id', as: 'classGroup' });

classSectionModel.belongsTo(acedmicYearModel, { foreignKey: 'acedmic_year_id', as: 'acedmicYearSection' });
acedmicYearModel.hasMany(classSectionModel, { foreignKey: 'acedmic_year_id', as: 'acedmicYearSection' });

courseModel.belongsTo(affiliatedIniversityModel, { foreignKey: 'affiliated_university_id', as: 'affiliated' });
affiliatedIniversityModel.hasMany(courseModel, { foreignKey: 'affiliated_university_id', as: 'affiliated' });

courseModel.belongsTo(instituteModel, { foreignKey: 'institute_id', as: 'instituted' });
instituteModel.hasMany(courseModel, { foreignKey: 'institute_id', as: 'instituted' });

employeeCodeMasterType.hasMany(courseModel, { foreignKey: "course_levelId", as: "coursesCodeMaster", });
courseModel.belongsTo(employeeCodeMasterType, { foreignKey: "course_levelId", as: "courseLevelCourses", });

affiliatedIniversityModel.belongsTo(instituteModel, { foreignKey: 'affiliated_university_id', as: 'institut' });
instituteModel.hasMany(affiliatedIniversityModel, { foreignKey: 'affiliated_university_id', as: 'institut' });

instituteModel.belongsTo(campusModel, { foreignKey: 'institute_id', as: 'campues' });
campusModel.hasMany(instituteModel, { foreignKey: 'institute_id', as: 'campues' });

campusModel.hasMany(instituteModel, {foreignKey: "campusId",as: "instituteData"});
instituteModel.belongsTo(campusModel, {foreignKey: "campusId",  as: "campusData",});

classSectionModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'courseSectionAdd' });
courseModel.hasMany(classSectionModel, { foreignKey: 'course_id', as: 'courseSectionAdd' });

// class section  mapper join to specialization

semesterModel.belongsTo(specializationModel, { foreignKey: 'specialization_id', as: 'specializationSemester' });
specializationModel.hasMany(semesterModel, { foreignKey: 'specialization_id', as: 'specializationSemester' });

// class section join to specialization
classSectionModel.belongsTo(specializationModel, { foreignKey: 'specialization_id', as: 'specializationSectionAdd' });
specializationModel.hasMany(classSectionModel, { foreignKey: 'specialization_id', as: 'specializationSectionAdd' });

// class subject mapper join to class section
classSubjectMapperModel.belongsTo(semesterModel, { foreignKey: 'semester_id', as: 'semestermapping' });
semesterModel.hasMany(classSubjectMapperModel, { foreignKey: 'semester_id', as: 'semestermapping' });

// class section join to subject  
classSubjectMapperModel.belongsTo(subjectModel, { foreignKey: 'subject_id', as: 'subjects' });
subjectModel.hasMany(classSubjectMapperModel, { foreignKey: 'subject_id', as: 'subjects' });

// class student mapper join to student  
classStudentMapperModel.belongsTo(studentModel, { foreignKey: 'student_id', as: 'studentMapped' });
studentModel.hasMany(classStudentMapperModel, { foreignKey: 'student_id', as: 'studentMapped' });

// class student mapper join to class section  
classStudentMapperModel.belongsTo(semesterModel, { foreignKey: 'semester_id', as: 'studentSection' });
semesterModel.hasMany(classStudentMapperModel, { foreignKey: 'semester_id', as: 'studentSection' });

classStudentMapperModel.belongsTo(classSectionModel, { foreignKey: 'semester_id', as: 'studentSectionDetail' });
classSectionModel.hasMany(classStudentMapperModel, { foreignKey: 'semester_id', as: 'studentSectionDetail' });

//student join to there 2 more table 
studentsEntranceDetail.belongsTo(studentModel, { foreignKey: 'student_id', as: 'entranceDetails' });
studentModel.hasMany(studentsEntranceDetail, { foreignKey: 'student_id', as: 'entranceDetails' });

studentsAddress.belongsTo(studentModel, { foreignKey: 'student_id', as: 'studentAddress' });
studentModel.hasMany(studentsAddress, { foreignKey: 'student_id', as: 'studentAddress' });

studentMetaData.belongsTo(studentModel, { foreignKey: 'student_id', as: 'studentMetaData' });
studentModel.hasMany(studentMetaData, { foreignKey: 'student_id', as: 'studentMetaData' });

studentCorsAddressModel.belongsTo(studentModel, { foreignKey: 'student_id', as: 'CorsAddressStudent' });
studentModel.hasMany(studentCorsAddressModel, { foreignKey: 'student_id', as: 'CorsAddressStudent' });

studentCorsAddressModel.belongsTo(employeeCodeMasterType, { foreignKey: 'c_country', as: 'codeMasterCountryStudent' });
employeeCodeMasterType.hasMany(studentCorsAddressModel, { foreignKey: 'c_country', as: 'codeMasterCountryStudent' });

studentCorsAddressModel.belongsTo(employeeCodeMasterType, { foreignKey: 'c_state', as: 'codeMasterStateStudent' });
employeeCodeMasterType.hasMany(studentCorsAddressModel, { foreignKey: 'c_state', as: 'codeMasterStateStudent' });

studentCorsAddressModel.belongsTo(employeeCodeMasterType, { foreignKey: 'c_city', as: 'codeMasterCityStudent' });
employeeCodeMasterType.hasMany(studentCorsAddressModel, { foreignKey: 'c_city', as: 'codeMasterCityStudent' });

// code type join to code master
employeeCodeMasterType.belongsTo(employeeCodeMaster, { foreignKey: 'employee_code_master_id', as: 'codes' });
employeeCodeMaster.hasMany(employeeCodeMasterType, { foreignKey: 'employee_code_master_id', as: 'codes' });

//employee join to there related table 
employeeAddressModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'address' });
employeeModel.hasMany(employeeAddressModel, { foreignKey: 'employee_id', as: 'address' });

employeeCorAddressModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'CorsAddress' });
employeeModel.hasMany(employeeCorAddressModel, { foreignKey: 'employee_id', as: 'CorsAddress' });

employeeOfficeModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'office' });
employeeModel.hasMany(employeeOfficeModel, { foreignKey: 'employee_id', as: 'office' });

emplopeeRoleModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'role' });
employeeModel.hasMany(emplopeeRoleModel, { foreignKey: 'employee_id', as: 'role' });

employeeSkillModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'skill' });
employeeModel.hasMany(employeeSkillModel, { foreignKey: 'employee_id', as: 'skill' });

employeeDocumentsModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'qualification' });
employeeModel.hasMany(employeeDocumentsModel, { foreignKey: 'employee_id', as: 'qualification' });

employeeQualificationModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'documents' });
employeeModel.hasMany(employeeQualificationModel, { foreignKey: 'employee_id', as: 'documents' });

employeeExperianceModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'experiance' });
employeeModel.hasMany(employeeExperianceModel, { foreignKey: 'employee_id', as: 'experiance' });

employeeAchievementModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'achievements' });
employeeModel.hasMany(employeeAchievementModel, { foreignKey: 'employee_id', as: 'achievements' });

employeeWardModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'ward' });
employeeModel.hasMany(employeeWardModel, { foreignKey: 'employee_id', as: 'ward' });

employeeActivityModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'activty' });
employeeModel.hasMany(employeeActivityModel, { foreignKey: 'employee_id', as: 'activty' });

employeeReferenceModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'reference' });
employeeModel.hasMany(employeeReferenceModel, { foreignKey: 'employee_id', as: 'reference' });

employeeResearchModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'research' });
employeeModel.hasMany(employeeResearchModel, { foreignKey: 'employee_id', as: 'research' });

employeeLongLeaveModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'longLeave' });
employeeModel.hasMany(employeeLongLeaveModel, { foreignKey: 'employee_id', as: 'longLeave' });

employeeMetaDataModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'employeeMetaData' });
employeeModel.hasMany(employeeMetaDataModel, { foreignKey: 'employee_id', as: 'employeeMetaData' });

employeeMetaDataModel.belongsTo(employeeCodeMasterType, { foreignKey: 'types', as: 'typess' });
employeeCodeMasterType.hasMany(employeeMetaDataModel, { foreignKey: 'types', as: 'typess' });

employeeFilesModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'files' });
employeeModel.hasMany(employeeFilesModel, { foreignKey: 'employee_id', as: 'files' });

employeeSkillModel.belongsTo(employeeCodeMasterType, { foreignKey: 'proficiency_level', as: 'codeMasterEmployeeSkill' });
employeeCodeMasterType.hasMany(employeeSkillModel, { foreignKey: 'proficiency_level', as: 'codeMasterEmployeeSkill' });

employeeDocumentsModel.belongsTo(employeeCodeMasterType, { foreignKey: 'qualifications', as: 'codeMasterDocumentQualification' });
employeeCodeMasterType.hasMany(employeeDocumentsModel, { foreignKey: 'qualifications', as: 'codeMasterDocumentQualification' });

employeeDocumentsModel.belongsTo(employeeCodeMasterType, { foreignKey: 'degree_level', as: 'codeMasterDocumentDegreeLevel' });
employeeCodeMasterType.hasMany(employeeDocumentsModel, { foreignKey: 'degree_level', as: 'codeMasterDocumentDegreeLevel' });

employeeDocumentsModel.belongsTo(employeeCodeMasterType, { foreignKey: 'stream', as: 'codeMasterDocumentStream' });
employeeCodeMasterType.hasMany(employeeDocumentsModel, { foreignKey: 'stream', as: 'codeMasterDocumentStream' });

employeeQualificationModel.belongsTo(employeeCodeMasterType, { foreignKey: 'document', as: 'codeMasterQualificationDocuments' });
employeeCodeMasterType.hasMany(employeeQualificationModel, { foreignKey: 'document', as: 'codeMasterQualificationDocuments' });

employeeExperianceModel.belongsTo(employeeCodeMasterType, { foreignKey: 'experience_type', as: 'codeMasterExperienceType' });
employeeCodeMasterType.hasMany(employeeExperianceModel, { foreignKey: 'experience_type', as: 'codeMasterExperienceType' });

employeeAchievementModel.belongsTo(employeeCodeMasterType, { foreignKey: 'achievement_category', as: 'codeMasterAchievementCategory' });
employeeCodeMasterType.hasMany(employeeAchievementModel, { foreignKey: 'achievement_category', as: 'codeMasterAchievementCategory' });

employeeLongLeaveModel.belongsTo(employeeCodeMasterType, { foreignKey: 'leave_type', as: 'codeMasterLeaveType' });
employeeCodeMasterType.hasMany(employeeLongLeaveModel, { foreignKey: 'leave_type', as: 'codeMasterLeaveType' });

employeeCorAddressModel.belongsTo(employeeCodeMasterType, { foreignKey: 'c_country', as: 'codeMasterCountry' });
employeeCodeMasterType.hasMany(employeeCorAddressModel, { foreignKey: 'c_country', as: 'codeMasterCountry' });

employeeCorAddressModel.belongsTo(employeeCodeMasterType, { foreignKey: 'c_state', as: 'codeMasterState' });
employeeCodeMasterType.hasMany(employeeCorAddressModel, { foreignKey: 'c_state', as: 'codeMasterState' });

employeeCorAddressModel.belongsTo(employeeCodeMasterType, { foreignKey: 'c_city', as: 'codeMasterCity' });
employeeCodeMasterType.hasMany(employeeCorAddressModel, { foreignKey: 'c_city', as: 'codeMasterCity' });

// teacher subject mapping
employeeModel.hasMany(teacherSubjectMappingModel, { foreignKey: 'employee_id', as: 'teacherEmployeeData' });
teacherSubjectMappingModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'teacherEmployeeData' });

classSubjectMapperModel.hasMany(teacherSubjectMappingModel, { foreignKey: 'class_subject_mapper_id', as: 'employeeSubject' });
teacherSubjectMappingModel.belongsTo(classSubjectMapperModel, { foreignKey: 'class_subject_mapper_id', as: 'employeeSubject' });

semesterModel.hasMany(classSubjectMapperModel, { foreignKey: 'semesterId', as: 'employeeClassSection' });
classSubjectMapperModel.belongsTo(semesterModel, { foreignKey: 'semesterId', as: 'employeeClassSection' });

// teacher section mapping
employeeModel.hasMany(teacherSectionMappingModel, { foreignKey: 'employee_id', as: 'employeeData' });
teacherSectionMappingModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'employeeData' });

employeeModel.belongsTo(campusModel, { foreignKey: 'campus_id', as: 'employeeCampus' });
campusModel.hasMany(employeeModel, { foreignKey: 'campus_id', as: 'employeeCampus' });

employeeModel.belongsTo(acedmicYearModel, { foreignKey: 'acedmic_year_id', as: 'acedmicYear' });
acedmicYearModel.hasMany(employeeModel, { foreignKey: 'acedmic_year_id', as: 'acedmicYear' });

employeeModel.belongsTo(roleModel, { foreignKey: 'role_id', as: 'employeeRole' });
roleModel.hasMany(employeeModel, { foreignKey: 'role_id', as: 'employeeRole' });

employeeModel.belongsTo(instituteModel, { foreignKey: 'institute_id', as: 'employeeInstitute' });
instituteModel.hasMany(employeeModel, { foreignKey: 'institute_id', as: 'employeeInstitute' });

classSectionModel.hasMany(teacherSectionMappingModel, { foreignKey: 'class_sections_id', as: 'employeeSection' });
teacherSectionMappingModel.belongsTo(classSectionModel, { foreignKey: 'class_sections_id', as: 'employeeSection' });

classSectionModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'employeeCourse' });
courseModel.hasMany(classSectionModel, { foreignKey: 'course_id', as: 'employeeCourse' });

//user join 
employeeCodeMasterType.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userEmployeeCodeType' });
userModel.hasMany(employeeCodeMasterType, { foreignKey: 'createdBy', as: 'userEmployeeCodeType' });

studentModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userStudent' });
userModel.hasMany(studentModel, { foreignKey: 'createdBy', as: 'userStudent' });

classStudentMapperModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userClassStudentMapper' });
userModel.hasMany(classStudentMapperModel, { foreignKey: 'createdBy', as: 'userClassStudentMapper' });

classSectionModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userClassSection' });
userModel.hasMany(classSectionModel, { foreignKey: 'createdBy', as: 'userClassSection' });

classSubjectMapperModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userClassSubjectMapper' });
userModel.hasMany(classSubjectMapperModel, { foreignKey: 'createdBy', as: 'userClassSubjectMapper' });

semesterModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userSemester' });
userModel.hasMany(semesterModel, { foreignKey: 'createdBy', as: 'userSemester' });

semesterModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'semesterCourse' });
courseModel.hasMany(semesterModel, { foreignKey: 'course_id', as: 'semesterCourse' });

employeeModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userEmployee' });
userModel.hasMany(employeeModel, { foreignKey: 'createdBy', as: 'userEmployee' });

teacherSubjectMappingModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userTeacherSubjectMapping' });
userModel.hasMany(teacherSubjectMappingModel, { foreignKey: 'createdBy', as: 'userTeacherSubjectMapping' });

teacherSectionMappingModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userTeacherSectionMapping' });
userModel.hasMany(teacherSectionMappingModel, { foreignKey: 'createdBy', as: 'userTeacherSectionMapping' });

// library creation join 
libraryCreationModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userLibraryCreation' });
userModel.hasMany(libraryCreationModel, { foreignKey: 'createdBy', as: 'userLibraryCreation' });

libraryAuthorityModel.belongsTo(libraryCreationModel, { foreignKey: 'library_creation_id', as: 'libraryCreationAuthority' });
libraryCreationModel.hasMany(libraryAuthorityModel, { foreignKey: 'library_creation_id', as: 'libraryCreationAuthority' });

libraryAuthorityModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'libraryEmployee' });
employeeModel.hasMany(libraryAuthorityModel, { foreignKey: 'employee_id', as: 'libraryEmployee' });

libraryCreationModel.belongsTo(instituteModel, { foreignKey: 'institute_id', as: 'libraryCreationInstitute' });
instituteModel.hasMany(libraryCreationModel, { foreignKey: 'institute_id', as: 'libraryCreationInstitute' });

// library item 
libraryAddItemModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userLibraryAddItem' });
userModel.hasMany(libraryAddItemModel, { foreignKey: 'createdBy', as: 'userLibraryAddItem' });

libraryAddItemModel.belongsTo(employeeCodeMasterType, { foreignKey: 'genre', as: 'genres' });
employeeCodeMasterType.hasMany(libraryAddItemModel, { foreignKey: 'genre', as: 'genres' });

libraryAddItemModel.belongsTo(employeeCodeMasterType, { foreignKey: 'aisle', as: 'aisles' });
employeeCodeMasterType.hasMany(libraryAddItemModel, { foreignKey: 'aisle', as: 'aisles' });

libraryAddItemModel.belongsTo(employeeCodeMasterType, { foreignKey: 'shelf', as: 'shelfs' });
employeeCodeMasterType.hasMany(libraryAddItemModel, { foreignKey: 'shelf', as: 'shelfs' });

// time table create
timeTableCreationModel.belongsTo(timeTableNameModel, { foreignKey: 'time_table_name_id', as: 'timeTableName' });
timeTableNameModel.hasMany(timeTableCreationModel, { foreignKey: 'time_table_name_id', as: 'timeTableName' });

timeTableCreationModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'timeTable' });
courseModel.hasMany(timeTableCreationModel, { foreignKey: 'course_id', as: 'timeTable' });

timeTableCreateModel.belongsTo(timeTableNameModel, { foreignKey: 'time_table_name_id', as: 'timeTableCreateName' });
timeTableNameModel.hasMany(timeTableCreateModel, { foreignKey: 'time_table_name_id', as: 'timeTableCreateName' });

timeTableCreateModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'timeTableCourse' });
courseModel.hasMany(timeTableCreateModel, { foreignKey: 'course_id', as: 'timeTableCourse' });

timeTableCreateModel.belongsTo(campusModel, { foreignKey: 'campus_id', as: 'timeTableCampus' });
campusModel.hasMany(timeTableCreateModel, { foreignKey: 'campus_id', as: 'timeTableCampus' });

timeTableCreateModel.belongsTo(classSectionModel, { foreignKey: 'class_sections_id', as: 'timeTableClassSection' });
classSectionModel.hasMany(timeTableCreateModel, { foreignKey: 'class_sections_id', as: 'timeTableClassSection' });

timeTableCreateModel.belongsTo(acedmicYearModel, { foreignKey: 'acedmic_year_id', as: 'acedmicYearTimeTable' });
acedmicYearModel.hasMany(timeTableCreateModel, { foreignKey: 'acedmic_year_id', as: 'acedmicYearTimeTable' });

timeTableMappingModel.belongsTo(teacherSubjectMappingModel, { foreignKey: 'teacher_subject_mapping_id', as: 'timeTableTeacherSubject' });
teacherSubjectMappingModel.hasMany(timeTableMappingModel, { foreignKey: 'teacher_subject_mapping_id', as: 'timeTableTeacherSubject' });

timeTableMappingModel.belongsTo(timeTableCreateModel, { foreignKey: 'time_table_create_id', as: 'timeTablecreate' });
timeTableCreateModel.hasMany(timeTableMappingModel, { foreignKey: 'time_table_create_id', as: 'timeTablecreate' });

timeTableMappingModel.belongsTo(timeTableCreationModel, { foreignKey: 'time_table_creation_id', as: 'timeTablecreation' });
timeTableCreationModel.hasMany(timeTableMappingModel, { foreignKey: 'time_table_creation_id', as: 'timeTablecreation' });

timeTableMappingModel.belongsTo(classRoomModel, { foreignKey: 'class_room_section_id', as: 'classRoom' });
classRoomModel.hasMany(timeTableMappingModel, { foreignKey: 'class_room_section_id', as: 'classRoom' });

timeTableMappingModel.belongsTo(electiveSubjectModel, { foreignKey: 'elective_subject_id', as: 'timeTableElective' });
electiveSubjectModel.hasMany(timeTableMappingModel, { foreignKey: 'elective_subject_id', as: 'timeTableElective' });

timeTableMappingModel.belongsTo(subjectModel, { foreignKey: 'subject_id', as: 'timeTableSubject' });
subjectModel.hasMany(timeTableMappingModel, { foreignKey: 'subject_id', as: 'timeTableSubject' });

// library member
libraryMemberModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userLibraryMember' });
userModel.hasMany(libraryMemberModel, { foreignKey: 'createdBy', as: 'userLibraryMember' });

libraryMemberModel.belongsTo(studentModel, { foreignKey: 'student_id', as: 'libraryMemberStudent' });
studentModel.hasMany(libraryMemberModel, { foreignKey: 'student_id', as: 'libraryMemberStudent' });

libraryMemberModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'libraryMemberEmployee' });
employeeModel.hasMany(libraryMemberModel, { foreignKey: 'employee_id', as: 'libraryMemberEmployee' });

libraryMemberModel.belongsTo(libraryCreationModel, { foreignKey: 'library_creation_id', as: 'libraryMemberCreation' });
libraryCreationModel.hasMany(libraryMemberModel, { foreignKey: 'library_creation_id', as: 'libraryMemberCreation' });

// library Book Issue
libraryIssueBookModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userBookIssue' });
userModel.hasMany(libraryIssueBookModel, { foreignKey: 'createdBy', as: 'userBookIssue' });

libraryIssueBookModel.belongsTo(libraryAddItemModel, { foreignKey: 'libraryAddItemId', as: 'addItemBookIssue' });
libraryAddItemModel.hasMany(libraryIssueBookModel, { foreignKey: 'libraryAddItemId', as: 'addItemBookIssue' });

libraryIssueBookModel.belongsTo(libraryMemberModel, { foreignKey: 'library_member_id', as: 'memberBookIssue' });
libraryMemberModel.hasMany(libraryIssueBookModel, { foreignKey: 'library_member_id', as: 'memberBookIssue' });

// attendence
attendanceModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userAttendence' });
userModel.hasMany(attendanceModel, { foreignKey: 'createdBy', as: 'userAttendence' });

attendanceModel.belongsTo(classSectionModel, { foreignKey: 'class_sections_id', as: 'classAttendance' });
classSectionModel.hasMany(attendanceModel, { foreignKey: 'class_sections_id', as: 'classAttendance' });

attendanceModel.belongsTo(studentModel, { foreignKey: 'student_id', as: 'studentAttendance' });
studentModel.hasMany(attendanceModel, { foreignKey: 'student_id', as: 'studentAttendance' });

attendanceModel.belongsTo(timeTableMappingModel, { foreignKey: 'timeTableMappingId', as: 'timeTableMapping' });
timeTableMappingModel.hasMany(attendanceModel, { foreignKey: 'timeTableMappingId', as: 'attendances' });

//fee (fee Group)
feeGroupModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userFeeGroup' });
userModel.hasMany(feeGroupModel, { foreignKey: 'createdBy', as: 'userFeeGroup' });

//fee (fee Type)
feeTypeModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userFeeType' });
userModel.hasMany(feeTypeModel, { foreignKey: 'createdBy', as: 'userFeeType' });

feeTypeModel.belongsTo(feeGroupModel, { foreignKey: 'fee_group_id', as: 'feeGroup' });
feeGroupModel.hasMany(feeTypeModel, { foreignKey: 'fee_group_id', as: 'feeGroup' });

//fee (fee Invoice)
feeInvoiceModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userFeeInvoice' });
userModel.hasMany(feeInvoiceModel, { foreignKey: 'createdBy', as: 'userFeeInvoice' });

feeInvoiceModel.belongsTo(feePlanModel, { foreignKey: 'fee_plan_id', as: 'feeInvoicePlan' });
feePlanModel.hasMany(feeInvoiceModel, { foreignKey: 'fee_plan_id', as: 'feeInvoicePlan' });

feeInvoiceModel.belongsTo(classStudentMapperModel, { foreignKey: 'class_student_mapper_id', as: 'feeStudentMapper' });
classStudentMapperModel.hasMany(feeInvoiceModel, { foreignKey: 'class_student_mapper_id', as: 'feeStudentMapper' });

//fee (fee Invoice Details)
feeInvoiceDetailModel.belongsTo(feePlanTypeModel, { foreignKey: 'fee_plan_type_id', as: 'feeInvoiceTypePlan' });
feePlanTypeModel.hasMany(feeInvoiceDetailModel, { foreignKey: 'fee_plan_type_id', as: 'feeInvoiceTypePlan' });

feeInvoiceDetailModel.belongsTo(feePlanSemesterModel, { foreignKey: 'fee_plan_semester_id', as: 'feeInvoiceTypeSemester' });
feePlanSemesterModel.hasMany(feeInvoiceDetailModel, { foreignKey: 'fee_plan_semester_id', as: 'feeInvoiceTypeSemester' });

feeInvoiceDetailModel.belongsTo(feeInvoiceModel, { foreignKey: 'fee_invoice_id', as: 'feeInvoiceDetails' });
feeInvoiceModel.hasMany(feeInvoiceDetailModel, { foreignKey: 'fee_invoice_id', as: 'feeInvoiceDetails' });

// user and userStudentEmployee

userStudentEmployeeModel.belongsTo(userModel, { foreignKey: 'user_id', as: 'userDetails' });
userModel.hasMany(userStudentEmployeeModel, { foreignKey: 'user_id', as: 'userDetails' });

userStudentEmployeeModel.belongsTo(studentModel, { foreignKey: 'student_id', as: 'studentDetails' });
studentModel.hasMany(userStudentEmployeeModel, { foreignKey: 'student_id', as: 'studentDetails' });

userStudentEmployeeModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'employeeDetails' });
employeeModel.hasMany(userStudentEmployeeModel, { foreignKey: 'employee_id', as: 'employeeDetails' });

//role permession mapping

rolePermissionMappingModel.belongsTo(roleModel, { foreignKey: 'role_id', as: 'userMapped' });
roleModel.hasMany(rolePermissionMappingModel, { foreignKey: 'role_id', as: 'userMapped' });

rolePermissionMappingModel.belongsTo(permissionModel, { foreignKey: 'permission_id', as: 'permissionMapped' });
permissionModel.hasMany(rolePermissionMappingModel, { foreignKey: 'permission_id', as: 'permissionMapped' });


//user role permission join to role and permission
userRolePermissionModel.belongsTo(roleModel, { foreignKey: 'role_id', as: 'userRole' });
roleModel.hasMany(userRolePermissionModel, { foreignKey: 'role_id', as: 'userRole' });

userRolePermissionModel.belongsTo(permissionModel, { foreignKey: 'permission_id', as: 'userPermission' });
permissionModel.hasMany(userRolePermissionModel, { foreignKey: 'permission_id', as: 'userPermission' });

userRolePermissionModel.belongsTo(userModel, { foreignKey: 'user_id', as: 'user' });
userModel.hasMany(userRolePermissionModel, { foreignKey: 'user_id', as: 'user' });

// dormitory join 
addDormitoryModel.belongsTo(dormitoryListModel, { foreignKey: 'add_dormitory_id', as: 'dormitoryList' });
dormitoryListModel.hasMany(addDormitoryModel, { foreignKey: 'add_dormitory_id', as: 'dormitoryList' });

addDormitoryModel.belongsTo(roomTypeModel, { foreignKey: 'add_dormitory_id', as: 'roomType' });
roomTypeModel.hasMany(addDormitoryModel, { foreignKey: 'add_dormitory_id', as: 'roomType' });

// Associations

examTypeModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'examTypeUser' });
userModel.hasMany(examTypeModel, { foreignKey: 'createdBy', as: 'examTypeUser' });

examSetupModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'examSetUpUser' });
userModel.hasMany(examSetupModel, { foreignKey: 'createdBy', as: 'examSetUpUser' });

examAttendanceModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'examAttendanceUser' });
userModel.hasMany(examAttendanceModel, { foreignKey: 'createdBy', as: 'examAttendanceUser' });

transportRouteModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'transportUser' });
userModel.hasMany(transportRouteModel, { foreignKey: 'createdBy', as: 'transportUser' });

vehicleModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'vehicleUser' });
userModel.hasMany(vehicleModel, { foreignKey: 'createdBy', as: 'vehicleUser' });

examSetupModel.belongsTo(employeeModel, { foreignKey: 'teacherId', as: 'employee' });
examSetupModel.belongsTo(classRoomModel, { foreignKey: 'roomId', as: 'room' });
examSetupModel.belongsTo(courseModel, { foreignKey: 'courseId', as: 'course' });
examSetupModel.belongsTo(subjectModel, { foreignKey: 'subjectId', as: 'subject' });
examSetupModel.belongsTo(examTypeModel, { foreignKey: 'examTypeId', as: 'examType' });``
examAttendanceModel.belongsTo(examSetupModel, { foreignKey: 'examSetupId', as: 'examSetup' });
examAttendanceModel.belongsTo(studentModel, { foreignKey: 'studentId', as: 'students' });

vehicleModel.belongsTo(employeeModel, { foreignKey: 'employeeId', as: 'employee' })
employeeModel.hasMany(vehicleModel, { foreignKey: 'employeeId', as: 'employee' });

//assignVehicles

assignVehicleModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'assignVehicleUser' });
userModel.hasMany(vehicleModel, { foreignKey: 'createdBy', as: 'assignVehicleUser' });

assignVehicleModel.belongsTo(transportRouteModel, { foreignKey: 'transportRouteId', as: 'transportRoute' })
transportRouteModel.hasMany(assignVehicleModel, { foreignKey: 'transportRouteId', as: 'transportRoute' });

assignVehicleModel.belongsTo(vehicleModel, { foreignKey: 'vehicleId', as: 'vehicle' })
vehicleModel.hasMany(assignVehicleModel, { foreignKey: 'vehicleId', as: 'vehicle' });

// acedmic year
// acedmicYearModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userAcedmicYear' });
// userModel.hasMany(acedmicYearModel, { foreignKey: 'createdBy', as: 'userAcedmicYear' });

buildingModel.belongsTo(campusModel, { foreignKey: 'campus_id', as: 'campusbuilding' });
campusModel.hasMany(buildingModel, { foreignKey: 'campus_id', as: 'campusbuilding' });

floorModel.belongsTo(buildingModel, { foreignKey: 'building_id', as: 'floorBuilding' });
buildingModel.hasMany(floorModel, { foreignKey: 'building_id', as: 'floorBuilding' });

classRoomModel.belongsTo(floorModel, { foreignKey: 'floor_id', as: 'roomFloor' });
floorModel.hasMany(classRoomModel, { foreignKey: 'floor_id', as: 'roomFloor' });

headModel.belongsTo(campusModel, { foreignKey: 'campus_id', as: 'headCampus' });
campusModel.hasMany(headModel, { foreignKey: 'campus_id', as: 'headCampus' });

headModel.belongsTo(instituteModel, { foreignKey: 'institute_id', as: 'headInstitute' });
instituteModel.hasMany(headModel, { foreignKey: 'institute_id', as: 'headInstitute' });

subAccountModel.belongsTo(accountModel, { foreignKey: 'account_id', as: 'accountDetail' });
accountModel.hasMany(subAccountModel, { foreignKey: 'account_id', as: 'accountDetail' });

departmentModel.belongsTo(subAccountModel, { foreignKey: 'sub_account_id', as: 'subAccountDetail' });
subAccountModel.hasMany(departmentModel, { foreignKey: 'sub_account_id', as: 'subAccountDetail' });

staffModel.belongsTo(departmentModel, { foreignKey: 'department_id', as: 'staffDepartment' });
departmentModel.hasMany(staffModel, { foreignKey: 'department_id', as: 'staffDepartment' });

staffModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'staffEmployee' });
employeeModel.hasMany(staffModel, { foreignKey: 'employee_id', as: 'staffEmployee' });

departmentStructureModel.belongsTo(accountModel, { foreignKey: 'account_id', as: 'mainAccount' });
accountModel.hasMany(departmentStructureModel, { foreignKey: 'account_id', as: 'mainAccount' });

departmentStructureModel.belongsTo(subAccountModel, { foreignKey: 'sub_account_id', as: 'subAccountDetails' });
subAccountModel.hasMany(departmentStructureModel, { foreignKey: 'sub_account_id', as: 'subAccountDetails' });

departmentStructureModel.belongsTo(subAccountModel, { foreignKey: 'parentAccountId', sourceKey: 'sub_account_id', as: 'departmentStructures' });
subAccountModel.hasMany(departmentStructureModel, { foreignKey: 'parentAccountId', targetKey: 'sub_account_id',as: 'parentAccounts' });

syllabusModel.hasMany(syllabusDetailsModel, { foreignKey: 'syllabus_id', as: 'syllabusDetails' });
syllabusDetailsModel.belongsTo(syllabusModel, { foreignKey: 'syllabus_id', as: 'syllabus' });

syllabusDetailsModel.belongsTo(subjectModel, { foreignKey: 'subject_id', as: 'syllabusSubject' });
subjectModel.hasMany(syllabusDetailsModel, { foreignKey: 'subject_id', as: 'syllabusSubject' });

syllabusModel.belongsTo(instituteModel, { foreignKey: 'institute_id', as: 'syllabusInstitute' });
instituteModel.hasMany(syllabusModel, { foreignKey: 'institute_id', as: 'syllabusInstitute' });

syllabusModel.belongsTo(acedmicYearModel, { foreignKey: 'acedmic_year_id', as: 'syllabusAcedmicYear' });
acedmicYearModel.hasMany(syllabusModel, { foreignKey: 'acedmic_year_id', as: 'syllabusAcedmicYear' });

syllabusModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'syllabusCourse' });
courseModel.hasMany(syllabusModel, { foreignKey: 'course_id', as: 'syllabusCourse' });

// syllabusModel.belongsTo(classSectionModel, { foreignKey: 'class_sections_id', as: 'syllabusClassSection' });
// classSectionModel.hasMany(syllabusModel, { foreignKey: 'class_sections_id', as: 'syllabusClassSection' });

faculityLoadModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'employeeFaculity' });
employeeModel.hasMany(faculityLoadModel, { foreignKey: 'employee_id', as: 'employeeFaculity' });

sessionModel.belongsTo(acedmicYearModel, { foreignKey: 'acedmic_year_id', as: 'sessionAcedmic' });
acedmicYearModel.hasMany(sessionModel, { foreignKey: 'acedmic_year_id', as: 'sessionAcedmic' });

poModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'courseDetail' });
courseModel.hasMany(poModel, { foreignKey: 'course_id', as: 'courseDetail' });

subjectModel.belongsTo(courseModel, {foreignKey: 'courseId',as: 'courseInfo' });
courseModel.hasMany(subjectModel, {foreignKey: 'courseId',as: 'subjectInfo'});

semesterModel.hasMany(classSectionModel, { foreignKey: 'semesterId',as: 'classSections'});
classSectionModel.belongsTo(semesterModel, { foreignKey: 'semesterId',as: 'semester'});

coModel.belongsTo(syllabusDetailsModel, { foreignKey: 'syllabus_details_id', as: 'cosyllabus' });
syllabusDetailsModel.hasMany(coModel, { foreignKey: 'syllabus_details_id', as: 'cosyllabus' });

coWeightageModel.belongsTo(coModel, { foreignKey: 'co_id', as: 'codetail' });
coModel.hasMany(coWeightageModel, { foreignKey: 'co_id', as: 'codetail' });

classSectionModel.belongsTo(sessionModel, { foreignKey: 'session_id', as: 'classSession' });
sessionModel.hasMany(classSectionModel, { foreignKey: 'session_id', as: 'classSession' });

sessionModel.hasMany(sessionCouseMappingModel, {foreignKey: 'sessionId',as: 'courseMappings' });
sessionCouseMappingModel.belongsTo(sessionModel, {foreignKey: 'sessionId',as: 'session' });

courseModel.hasMany(sessionCouseMappingModel, {foreignKey: 'courseId',as: 'sessionCourseMappings'});
sessionCouseMappingModel.belongsTo(courseModel, {foreignKey: 'courseId',as: 'courses'});

// feePlanTypeModel.belongsTo(feeTypeModel, { foreignKey: 'fee_type_id', as: 'feeType' });
// feeTypeModel.hasMany(feePlanTypeModel, { foreignKey: 'fee_type_id', as: 'feeType' });

feeInvoiceDetailRecordModel.belongsTo(studentInvoiceMapperModel, { foreignKey: 'studentInvoiceMapperId', as: 'studentMakePayment' });
studentInvoiceMapperModel.hasMany(feeInvoiceDetailRecordModel, { foreignKey: 'studentInvoiceMapperId', as: 'studentMakePayment' });

feeInvoiceModel.hasMany(feeInvoiceDetailModel, { foreignKey: 'feeInvoiceId',sourceKey: 'feeInvoiceId',as: 'invoiceDetails'});
feeInvoiceDetailModel.belongsTo(feeInvoiceModel, { foreignKey: 'feeInvoiceId', targetKey: 'feeInvoiceId', as: 'feeInvoices' });

employeeModel.hasMany(timeTableMappingModel, { foreignKey: 'employeeId', as: 'timeTableMappings' });
timeTableMappingModel.belongsTo(employeeModel, { foreignKey: 'employeeId', as: 'employeeDetails' });

feePlanModel.hasMany(feeNewInvoiceModel, { foreignKey: 'fee_plan_id',  as: 'invoices' })
feeNewInvoiceModel.belongsTo(feePlanModel, { foreignKey: 'fee_plan_id', as: 'feePlan' });

feeNewInvoiceModel.hasMany(feePlanSemesterModel, { foreignKey: 'fee_new_invoice_id',  as: 'semesters' }); 
feePlanSemesterModel.belongsTo(feeNewInvoiceModel, { foreignKey: 'fee_new_invoice_id', as: 'invoice' });

feeNewInvoiceModel.hasMany(feePlanTypeModel, { foreignKey: 'fee_new_invoice_id', as: 'additionalFees' }); 
feePlanTypeModel.belongsTo(feeNewInvoiceModel, { foreignKey: 'fee_new_invoice_id', as: 'additionalFeesinvoice' });

studentInvoiceMapperModel.belongsTo(studentModel, { foreignKey: 'studentId', as: 'studentinvoice'  }); 
studentModel.hasMany(studentInvoiceMapperModel, { foreignKey: 'studentId',  as: 'invoicestudent'  });

studentInvoiceMapperModel.belongsTo(feeTypeModel, { foreignKey: 'feeTypeId', as: 'studentinvoiceFeeType'  }); 
feeTypeModel.hasMany(studentInvoiceMapperModel, { foreignKey: 'feeTypeId',  as: 'invoicestudentFeeType'  });

studentInvoiceMapperModel.belongsTo(feeNewInvoiceModel, { foreignKey: 'feeNewInvoiceId',  as: 'feeInvoicedata' }); 
feeNewInvoiceModel.hasMany(studentInvoiceMapperModel, { foreignKey: 'feeNewInvoiceId', as: 'invoiceMappings' });

feePlanModel.belongsTo(courseModel, { foreignKey: 'courseId', as: 'courseFee' }); 
courseModel.hasMany(feePlanModel, { foreignKey: 'courseId', as: 'feePlanCourse' });

feePlanModel.belongsTo(acedmicYearModel, { foreignKey: 'acedmicYearId', as: 'acedmicYearFee' });
acedmicYearModel.hasMany(feePlanModel, { foreignKey: 'acedmicYearId', as: 'feePlanAcedmic' });

feePlanModel.belongsTo(sessionModel, { foreignKey: 'sessionId', as: 'sessionFee' });
sessionModel.hasMany(feePlanModel, { foreignKey: 'sessionId', as: 'feePlanSession' });

lessonModel.belongsTo(subjectModel, { foreignKey: 'subjectId', as: 'lessonSubject' });
subjectModel.hasMany(lessonModel, { foreignKey: 'subjectId', as: 'lessonSubject' });

lessonModel.belongsTo(employeeModel, { foreignKey: 'employeeId', as: 'employeeLesson' });
employeeModel.hasMany(lessonModel, { foreignKey: 'employeeId', as: 'employeeLesson' });

lessonModel.belongsTo(semesterModel, { foreignKey: 'subjectId', as: 'lessionSemester' });
semesterModel.hasMany(lessonModel, { foreignKey: 'subjectId', as: 'semesterLession' });

lessonModel.belongsTo(sessionModel, { foreignKey: 'subjectId', as: 'lessionSession' });
sessionModel.hasMany(lessonModel, { foreignKey: 'subjectId', as: 'sessionLession' });

topicModel.belongsTo(lessonModel, { foreignKey: 'lessonId', as: 'lessonTopic' });
lessonModel.hasMany(topicModel, { foreignKey: 'lessonId', as: 'topicSession' });

lessonMappingModel.belongsTo(topicModel, { foreignKey: 'topicId', as: 'mappingTopic' });
topicModel.hasMany(lessonMappingModel, { foreignKey: 'topicId', as: 'topicMapping' });

subTopicModel.belongsTo(topicModel, { foreignKey: 'topicId', as: 'topic' });
topicModel.hasMany(subTopicModel, { foreignKey: 'topicId', as: 'subTopic' });

lessonMappingModel.belongsTo(timeTableMappingModel, { foreignKey: 'timeTableMappingId', as: 'timeTableMapping' });
timeTableMappingModel.hasMany(lessonMappingModel, { foreignKey: 'timeTableMappingId', as: 'timeTableMapping' });

courseModel.hasMany(examStructureModel, { foreignKey: 'courseId', sourceKey: 'courseId', as: 'examStructuresCourse' });
examStructureModel.belongsTo(courseModel, { foreignKey: 'courseId', targetKey: 'courseId', as: 'courseExam' });

sessionModel.hasMany(examStructureModel, { foreignKey: 'sessionId', sourceKey: 'sessionId', as: 'examStructuresSession' });
examStructureModel.belongsTo(sessionModel, { foreignKey: 'sessionId', targetKey: 'sessionId', as: 'sessionExam' });

acedmicYearModel.hasMany(examStructureModel, { foreignKey: 'acedmicYearId', sourceKey: 'acedmicYearId', as: 'examStructuresAcedmic' });
examStructureModel.belongsTo(acedmicYearModel, { foreignKey: 'acedmicYearId', targetKey: 'acedmicYearId', as: 'acedmicExam' });

syllabusUnitModel.belongsTo(acedmicYearModel, { foreignKey: "acedmicYearId", targetKey: "acedmicYearId", as: "acedmicYearUnit" });
acedmicYearModel.hasMany(syllabusUnitModel, { foreignKey: "acedmicYearId", sourceKey: "acedmicYearId", as: "syllabusUnitsAcedmic" });

syllabusUnitModel.belongsTo(sessionModel, { foreignKey: "sessionId", as: "sessionUnit" });
sessionModel.hasMany(syllabusUnitModel, { foreignKey: "sessionId", as: "syllabusUnitsSession" });

syllabusUnitModel.belongsTo(semesterModel, { foreignKey: "semesterId",as: "semesterUnit" });
semesterModel.hasMany(syllabusUnitModel, { foreignKey: "semesterId",  as: "syllabusUnitsSemester" });

syllabusUnitModel.belongsTo(subjectModel, { foreignKey: "subjectId",  as: "subjectUnit" });
subjectModel.hasMany(syllabusUnitModel, { foreignKey: "subjectId", as: "syllabusUnitsSubject" });

syllabusUnitModel.belongsTo(instituteModel, { foreignKey: "instituteId", as: "instituteUnit" });
instituteModel.hasMany(syllabusUnitModel, { foreignKey: "instituteId", as: "syllabusUnitsInstitute" });

examStructureModel.hasMany(examSetupTypeModel, { foreignKey: "exam_structure_id", as: "setupTypes" });
examSetupTypeModel.belongsTo(examStructureModel, { foreignKey: "exam_structure_id", as: "examStructure" });

scheduleModel.hasMany(scheduleAssignModel, { foreignKey: "scheduleId", as: "assignedEmployees" });
scheduleAssignModel.belongsTo(scheduleModel, { foreignKey: "scheduleId", as: "schedule" }); 

employeeModel.hasMany(scheduleAssignModel, { foreignKey: "employeeId", as: "assignedSchedules" });
scheduleAssignModel.belongsTo(employeeModel, { foreignKey: "employeeId", as: "employeeSchedule" });

scheduleAssignModel.hasMany(teacherAttendeceModel, { foreignKey: "scheduleAssignId", as: "attendances" }); 
teacherAttendeceModel.belongsTo(scheduleAssignModel, { foreignKey: "scheduleAssignId", as: "scheduleAssign" });

leaveRequestModel.belongsTo(employeeModel, { foreignKey: "employee_id", as: "employeeRequest" });
employeeModel.hasMany(leaveRequestModel, { foreignKey: "employee_id", as: "employeePolicy" });

leaveRequestModel.belongsTo(leavePolicyModel, { foreignKey: "policy_id", as: "leaveRequestsPolicy" });
leavePolicyModel.hasMany(leaveRequestModel, { foreignKey: "policy_id", as: "leaveRequests" });

leaveBalanceModel.belongsTo(leavePolicyModel, { foreignKey: "policy_id", as: "leaveBalancePolicy" });
leavePolicyModel.hasMany(leaveBalanceModel, { foreignKey: "policy_id", as: "leaveBalance" });

examSetupTypeModel.hasMany(examStructureScheduleMappingModel, {foreignKey: "exam_setup_type_id",as: "scheduleMappers"});
examStructureScheduleMappingModel.belongsTo(examSetupTypeModel, {foreignKey: "exam_setup_type_id",as: "examSetupType"});

sessionModel.hasMany(examStructureScheduleMappingModel, {foreignKey: "session_id",as: "sessionSchedule"});
examStructureScheduleMappingModel.belongsTo(sessionModel, {foreignKey: "session_id",as: "sessionSchedule"});

examScheduleModel.belongsTo(examStructureScheduleMappingModel, {foreignKey: "exam_structure_schedule_mapper_id",as: "mapperSchedule"});
examStructureScheduleMappingModel.hasMany(examScheduleModel, {foreignKey: "exam_structure_schedule_mapper_id",as: "mapperSchedule"});

examScheduleModel.belongsTo(subjectModel, {foreignKey: "subject_id",as: "subjectSchedule"});
subjectModel.hasMany(examScheduleModel, {foreignKey: "subject_id",as: "scheduleSubject"});

examSetupTypeModel.hasMany(syllabusDetailsModel, {foreignKey: "exam_setup_type_id",as: "syllabusDetailsExam"});
syllabusDetailsModel.belongsTo(examSetupTypeModel, {foreignKey: "exam_setup_type_id",as: "examSetupTypeSyllabus"});

examScheduleModel.belongsTo(semesterModel, {foreignKey: "semesterId",targetKey: "semesterId",as: "semesterexam"});
semesterModel.hasMany(examScheduleModel, {foreignKey: "semesterId",sourceKey: "semesterId",as: "examSchedules"});

export {
    settingModel,
    universityModel,
    campusModel,
    instituteModel,
    affiliatedIniversityModel,
    courseModel,
    specializationModel,
    semesterModel,
    studentModel,
    subjectModel,
    studentsEntranceDetail,
    studentsAddress,
    studentCorsAddressModel,
    employeeCodeMaster,
    employeeCodeMasterType,
    classSectionModel,
    classSubjectMapperModel,
    classStudentMapperModel,
    subjectMapperModel,
    studentElectiveSubjectModel,
    studentMetaData,
    userModel,
    employeeModel,
    employeeAddressModel,
    employeeCorAddressModel,
    employeeOfficeModel,
    emplopeeRoleModel,
    employeeSkillModel,
    employeeDocumentsModel,
    employeeQualificationModel,
    employeeExperianceModel,
    employeeAchievementModel,
    employeeWardModel,
    employeeActivityModel,
    employeeReferenceModel,
    employeeResearchModel,
    employeeLongLeaveModel,
    employeeMetaDataModel,
    employeeFilesModel,
    teacherSubjectMappingModel,
    teacherSectionMappingModel,
    libraryCreationModel,
    libraryAuthorityModel,
    libraryAddItemModel,
    libraryMemberModel,
    libraryIssueBookModel,
    libraryAuthorDetailsModel,
    libraryMultipleBookDetailsModel,
    timeTableNameModel,
    timeTableCreationModel,
    faculityLoadModel,
    timeTableCreateModel,
    timeTableMappingModel,
    attendanceModel,
    classRoomModel,
    feeGroupModel,
    feeTypeModel,
    feeInvoiceModel,
    feeInvoiceDetailModel,
    userStudentEmployeeModel,
    roleModel,
    permissionModel,
    rolePermissionMappingModel,
    userRolePermissionModel,
    roomTypeModel,
    dormitoryListModel,
    addDormitoryModel,
    examTypeModel,
    examSetupModel,
    examAttendanceModel,
    transportRouteModel,
    vehicleModel,
    assignVehicleModel,
    acedmicYearModel,
    sectionModel,
    holidayModel,
    electiveSubjectModel,
    buildingModel,
    floorModel,
    headModel,
    accountModel,
    subAccountModel,
    departmentModel,
    staffModel,
    departmentStructureModel,
    syllabusDetailsModel,
    syllabusModel,
    classModel,
    sessionModel,
    sessionCouseMappingModel,
    poModel,
    coModel,
    coWeightageModel,
    feePlanModel,
    feePlanTypeModel,
    feePlanSemesterModel,
    feeInvoiceDetailRecordModel,
    feeNewInvoiceModel,
    studentInvoiceMapperModel,
    lessonModel,
    topicModel,
    subTopicModel,
    lessonMappingModel,
    noticeModel,
    examStructureModel,
    syllabusUnitModel,
    examSetupTypeModel,
    scheduleModel,
    scheduleAssignModel,
    teacherAttendeceModel,
    leaveBalanceModel,
    leavePolicyModel,
    leaveRequestModel,
    examStructureScheduleMappingModel,
    examScheduleModel,
};