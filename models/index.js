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
import teacherSubjectMappingModel from './teacherSubjectMappingModel.js';
import teacherSectionMappingModel from './teacherSectionMappingModel.js';

studentModel.belongsTo(campusModel, { foreignKey: 'campus_id', as: 'campus' });
campusModel.hasMany(studentModel, { foreignKey: 'campus_id', as: 'campus' });
  
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

studentMetaData.belongsTo(employeeCodeMasterType, { foreignKey: 'types', as: 'typs' });
employeeCodeMasterType.hasMany(studentMetaData, { foreignKey: 'types', as: 'typs' });

// class section join 

classSectionModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'courseSection' });
courseModel.hasMany(classSectionModel, { foreignKey: 'course_id', as: 'courseSection' });

courseModel.belongsTo(affiliatedIniversityModel, { foreignKey: 'affiliated_university_id', as: 'affiliated' });
affiliatedIniversityModel.hasMany(courseModel, { foreignKey: 'affiliated_university_id', as: 'affiliated' });

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

// class subject mapper join to employee Code Master Type 

classSectionModel.belongsTo(employeeCodeMasterType, { foreignKey: 'acedmic_period_id', as: 'acedmicPeriods' });
employeeCodeMasterType.hasMany(classSectionModel, { foreignKey: 'acedmic_period_id', as: 'acedmicPeriods' });

// class section join to subject  

classSubjectMapperModel.belongsTo(subjectModel, { foreignKey: 'subject_id', as: 'subjects' });
subjectModel.hasMany(classSubjectMapperModel, { foreignKey: 'subject_id', as: 'subjects' });

// class student mapper join to student  
classStudentMapperModel.belongsTo(studentModel, { foreignKey: 'student_id', as: 'studentMapped' });
studentModel.hasMany(classStudentMapperModel, { foreignKey: 'student_id', as: 'studentMapped' });

//student join to there 2 more table 
studentsEntranceDetail.belongsTo(studentModel, { foreignKey: 'student_id', as: 'entranceDetails' });
studentModel.hasMany(studentsEntranceDetail, { foreignKey: 'student_id', as: 'entranceDetails' });

studentsAddress.belongsTo(studentModel, { foreignKey: 'student_id', as: 'studentAddress' });
studentModel.hasMany(studentsAddress, { foreignKey: 'student_id', as: 'studentAddress' });

studentMetaData.belongsTo(studentModel, { foreignKey: 'student_id', as: 'studentMetaData' });
studentModel.hasMany(studentMetaData, { foreignKey: 'student_id', as: 'studentMetaData' });

// code type join to code master
employeeCodeMasterType.belongsTo(employeeCodeMaster, { foreignKey: 'employee_code_master_id', as: 'codes' });
employeeCodeMaster.hasMany(employeeCodeMasterType, { foreignKey: 'employee_code_master_id', as: 'codes' });

//employee join to there related table 
employeeAddressModel.belongsTo(employeeModel, { foreignKey: 'employee_id', as: 'address' });
employeeModel.hasMany(employeeAddressModel, { foreignKey: 'employee_id', as: 'address' });

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
    teacherSubjectMappingModel,
    teacherSectionMappingModel,
  };