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
import timeTableCreationModel from './timeTableCreationModel.js';
import faculityLoadModel from './faculityLoadModel.js';
import timeTableCreateModel from './timeTableCreateModel.js';
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

studentModel.belongsTo(specializationModel, { foreignKey: 'specialization_id', as: 'specialization' });
specializationModel.hasMany(studentModel, { foreignKey: 'specialization_id', as: 'specialization' });

studentModel.belongsTo(employeeCodeMasterType, { foreignKey: 'course_level_id', as: 'courseLevel' });
employeeCodeMasterType.hasMany(studentModel, { foreignKey: 'course_level_id', as: 'courseLevel' });

userStudentEmployeeModel.belongsTo(studentModel, { foreignKey: 'student_id', as: 'student' })
studentModel.hasOne(userStudentEmployeeModel, { foreignKey: 'student_id', as: 'student' })

studentMetaData.belongsTo(employeeCodeMasterType, { foreignKey: 'types', as: 'typs' });
employeeCodeMasterType.hasMany(studentMetaData, { foreignKey: 'types', as: 'typs' });

// class section join 

classSectionModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'courseSection' });
courseModel.hasMany(classSectionModel, { foreignKey: 'course_id', as: 'courseSection' });

classSectionModel.belongsTo(acedmicYearModel, { foreignKey: 'acedmic_year_id', as: 'acedmicYearSection' });
acedmicYearModel.hasMany(classSectionModel, { foreignKey: 'acedmic_year_id', as: 'acedmicYearSection' });

courseModel.belongsTo(affiliatedIniversityModel, { foreignKey: 'affiliated_university_id', as: 'affiliated' });
affiliatedIniversityModel.hasMany(courseModel, { foreignKey: 'affiliated_university_id', as: 'affiliated' });

courseModel.belongsTo(acedmicYearModel, { foreignKey: 'acedmic_year_id', as: 'courseacedmicYear' });
acedmicYearModel.hasMany(courseModel, { foreignKey: 'acedmic_year_id', as: 'courseacedmicYear' });

affiliatedIniversityModel.belongsTo(instituteModel, { foreignKey: 'affiliated_university_id', as: 'institut' });
instituteModel.hasMany(affiliatedIniversityModel, { foreignKey: 'affiliated_university_id', as: 'institut' });

instituteModel.belongsTo(campusModel, { foreignKey: 'institute_id', as: 'campues' });
campusModel.hasMany(instituteModel, { foreignKey: 'institute_id', as: 'campues' });

classSectionModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'courseSectionAdd' });
courseModel.hasMany(classSectionModel, { foreignKey: 'course_id', as: 'courseSectionAdd' });

// class section  mapper join to specialization

classSectionModel.belongsTo(specializationModel, { foreignKey: 'specialization_id', as: 'specializationSection' });
specializationModel.hasMany(classSectionModel, { foreignKey: 'specialization_id', as: 'specializationSection' });

// class section join to specialization
classSectionModel.belongsTo(specializationModel, { foreignKey: 'specialization_id', as: 'specializationSectionAdd' });
specializationModel.hasMany(classSectionModel, { foreignKey: 'specialization_id', as: 'specializationSectionAdd' });

// class subject mapper join to class section
classSubjectMapperModel.belongsTo(classSectionModel, { foreignKey: 'class_sections_id', as: 'classSection' });
classSectionModel.hasMany(classSubjectMapperModel, { foreignKey: 'class_sections_id', as: 'classSection' });

// class section join to subject  
classSubjectMapperModel.belongsTo(subjectModel, { foreignKey: 'subject_id', as: 'subjects' });
subjectModel.hasMany(classSubjectMapperModel, { foreignKey: 'subject_id', as: 'subjects' });

// class student mapper join to student  
classStudentMapperModel.belongsTo(studentModel, { foreignKey: 'student_id', as: 'studentMapped' });
studentModel.hasMany(classStudentMapperModel, { foreignKey: 'student_id', as: 'studentMapped' });

// class student mapper join to class section  
classStudentMapperModel.belongsTo(classSectionModel, { foreignKey: 'class_sections_id', as: 'studentSection' });
classSectionModel.hasMany(classStudentMapperModel, { foreignKey: 'class_sections_id', as: 'studentSection' });

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

classSectionModel.hasMany(classSubjectMapperModel, { foreignKey: 'class_sections_id', as: 'employeeClassSection' });
classSubjectMapperModel.belongsTo(classSectionModel, { foreignKey: 'class_sections_id', as: 'employeeClassSection' });

// teacher section mapping
employeeModel.hasMany(teacherSectionMappingModel, { foreignKey: 'employee_id', as: 'employeeData' });
teacherSectionMappingModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'employeeData' });

employeeModel.belongsTo(campusModel, { foreignKey: 'campus_id', as: 'employeeCampus' });
campusModel.hasMany(employeeModel, { foreignKey: 'campus_id', as: 'employeeCampus' });

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
timeTableCreateModel.belongsTo(timeTableCreationModel, { foreignKey: 'time_table_creation_id', as: 'timeTable' });
timeTableCreationModel.hasMany(timeTableCreateModel, { foreignKey: 'time_table_creation_id', as: 'timeTable' });

timeTableCreationModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'timeTableCourse' });
courseModel.hasMany(timeTableCreationModel, { foreignKey: 'course_id', as: 'timeTableCourse' });

timeTableCreateModel.belongsTo(teacherSubjectMappingModel, { foreignKey: 'teacher_subject_mapping_id', as: 'timeTableTeacherSubjectMapping' });
teacherSubjectMappingModel.hasMany(timeTableCreateModel, { foreignKey: 'teacher_subject_mapping_id', as: 'timeTableTeacherSubjectMapping' });

timeTableCreationModel.hasMany(timeTableCreateModel, { foreignKey: 'time_table_create_id', as: 'timeTableCreate' });
timeTableCreateModel.belongsTo(timeTableCreationModel, { foreignKey: 'time_table_create_id', as: 'timeTableCreate' });

timeTableCreateModel.belongsTo(teacherSectionMappingModel, { foreignKey: 'teacher_section_mapping_id', as: 'timeTableTeacherSectionMapping' });
teacherSectionMappingModel.hasMany(timeTableCreateModel, { foreignKey: 'teacher_section_mapping_id', as: 'timeTableTeacherSectionMapping' });

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

attendanceModel.belongsTo(timeTableCreateModel, { foreignKey: 'time_table_create_id', as: 'timeTableAttendance' });
timeTableCreateModel.hasMany(attendanceModel, { foreignKey: 'time_table_create_id', as: 'timeTableAttendance' });

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

feeInvoiceModel.belongsTo(feeGroupModel, { foreignKey: 'fee_group_id', as: 'feeInvoiceGroup' });
feeGroupModel.hasMany(feeInvoiceModel, { foreignKey: 'fee_group_id', as: 'feeInvoiceGroup' });

feeInvoiceModel.belongsTo(classStudentMapperModel, { foreignKey: 'class_student_mapper_id', as: 'feeStudentMapper' });
classStudentMapperModel.hasMany(feeInvoiceModel, { foreignKey: 'class_student_mapper_id', as: 'feeStudentMapper' });

//fee (fee Invoice Details)
feeInvoiceDetailModel.belongsTo(feeTypeModel, { foreignKey: 'fee_type_id', as: 'feeInvoiceType' });
feeTypeModel.hasMany(feeInvoiceDetailModel, { foreignKey: 'fee_type_id', as: 'feeInvoiceType' });

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
acedmicYearModel.belongsTo(userModel, { foreignKey: 'createdBy', as: 'userAcedmicYear' });
userModel.hasMany(acedmicYearModel, { foreignKey: 'createdBy', as: 'userAcedmicYear' });


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
    timeTableCreationModel,
    faculityLoadModel,
    timeTableCreateModel,
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
};
