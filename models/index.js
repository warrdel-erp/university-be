import settingModel from './settingModel.js';
import universityModel from './universityModel.js';
import campusModel from './campusModel.js';
import instituteModel from './instituteModel.js';
import affiliatedIniversityModel from './affiliatedUniversityModel.js';
import courseModel from './courseModel.js';
import studentModel from './studentModel.js';
import specializationModel from './specializationModel.js';
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
classSubjectMapperModel.belongsTo(courseModel, { foreignKey: 'class_sections_id', as: 'courseSection' });
courseModel.hasMany(classSubjectMapperModel, { foreignKey: 'class_sections_id', as: 'courseSection' });

courseModel.belongsTo(affiliatedIniversityModel, { foreignKey: 'course_id', as: 'affiliated' });
affiliatedIniversityModel.hasMany(courseModel, { foreignKey: 'course_id', as: 'affiliated' });

affiliatedIniversityModel.belongsTo(instituteModel, { foreignKey: 'affiliated_university_id', as: 'institut' });
instituteModel.hasMany(affiliatedIniversityModel, { foreignKey: 'affiliated_university_id', as: 'institut' });

instituteModel.belongsTo(campusModel, { foreignKey: 'institute_id', as: 'campues' });
campusModel.hasMany(instituteModel, { foreignKey: 'institute_id', as: 'campues' });

classSectionModel.belongsTo(courseModel, { foreignKey: 'class_sections_id', as: 'courseSectionAdd' });
courseModel.hasMany(classSectionModel, { foreignKey: 'class_sections_id', as: 'courseSectionAdd' });

// class section  mapper join to specialization
classSubjectMapperModel.belongsTo(specializationModel, { foreignKey: 'class_sections_id', as: 'specializationSection' });
specializationModel.hasMany(classSubjectMapperModel, { foreignKey: 'class_sections_id', as: 'specializationSection' });

// class section join to specialization
classSectionModel.belongsTo(specializationModel, { foreignKey: 'class_sections_id', as: 'specializationSectionAdd' });
specializationModel.hasMany(classSectionModel, { foreignKey: 'class_sections_id', as: 'specializationSectionAdd' });

// class subject mapper join to class section
classSubjectMapperModel.belongsTo(classSectionModel, { foreignKey: 'class_sections_id', as: 'classSection' });
classSectionModel.hasMany(classSubjectMapperModel, { foreignKey: 'class_sections_id', as: 'classSection' });

// class subject mapper join to employee Code Master Type  
classSubjectMapperModel.belongsTo(employeeCodeMasterType, { foreignKey: 'semester_id', as: 'semester' });
employeeCodeMasterType.hasMany(classSubjectMapperModel, { foreignKey: 'semester_id', as: 'semester' });

// class section join to subject  
classSectionModel.belongsTo(subjectModel, { foreignKey: 'class_sections_id', as: 'subjects' });
subjectModel.hasMany(classSectionModel, { foreignKey: 'class_sections_id', as: 'subjects' });

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
export {
    settingModel,
	universityModel,
	campusModel,
    instituteModel,
    affiliatedIniversityModel,
    courseModel,
    specializationModel,
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
  };