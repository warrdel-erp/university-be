import settingModel from './settingModel.js';
import universityModel from './universityModel.js';
import campusModel from './campusModel.js';
import instituteModel from './instituteModel.js';
import affiliatedIniversityModel from './affiliatedUniversityModel.js';
import courseLevelModel from './courseLevelModel.js';
import courseModel from './courseModel.js';
import studentModel from './studentModel.js';
import specializationModel from './specializationModel.js';
import subjectModel from './subjectModel.js';
import studentsEntranceDetail from './studentsEntranceDetailModel.js';
import studentsAddress from './studentsAddressModel.js';
import subjectMapperModel from './subjectMapperModel.js';

studentModel.belongsTo(campusModel, { foreignKey: 'campus_id', as: 'campus' });
campusModel.hasMany(studentModel, { foreignKey: 'campus_id', as: 'campus' });
  
studentModel.belongsTo(instituteModel, { foreignKey: 'institute_id', as: 'institute' });
instituteModel.hasMany(studentModel, { foreignKey: 'institute_id', as: 'institute' });

studentModel.belongsTo(affiliatedIniversityModel, { foreignKey: 'affiliated_university_id', as: 'affiliatedUniversity' });
affiliatedIniversityModel.hasMany(studentModel, { foreignKey: 'affiliated_university_id', as: 'affiliatedUniversity' });

studentModel.belongsTo(courseLevelModel, { foreignKey: 'course_level_id', as: 'courseLevel' });
courseLevelModel.hasMany(studentModel, { foreignKey: 'course_level_id', as: 'courseLevel' });
  
studentModel.belongsTo(courseModel, { foreignKey: 'course_id', as: 'course' });
courseModel.hasMany(studentModel, { foreignKey: 'course_id', as: 'course' });

studentModel.belongsTo(specializationModel, { foreignKey: 'specialization_id', as: 'specialization' });
specializationModel.hasMany(studentModel, { foreignKey: 'specialization_id', as: 'specialization' });

studentsEntranceDetail.belongsTo(studentModel, { foreignKey: 'student_id', as: 'entranceDetails' });
studentModel.hasMany(studentsEntranceDetail, { foreignKey: 'student_id', as: 'entranceDetails' });

studentsAddress.belongsTo(studentModel, { foreignKey: 'student_id', as: 'studentAddress' });
studentModel.hasMany(studentsAddress, { foreignKey: 'student_id', as: 'studentAddress' });

export {
    settingModel,
	universityModel,
	campusModel,
    instituteModel,
    affiliatedIniversityModel,
    courseLevelModel,
    courseModel,
    specializationModel,
	studentModel,
    subjectModel,
    studentsEntranceDetail,
    studentsAddress,
    subjectMapperModel,
  };