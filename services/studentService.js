import { getCourseCode,getInstituteCode } from '../repository/collegeRepository.js';
import * as studentRepository from '../repository/studentRepository.js';
import * as fileHandler from '../utility/fileHandler.js';
import moment from 'moment';
import { uploadFile } from '../utility/awsServices.js';
import sequelize from '../database/sequelizeConfig.js';
import { getSettingValue } from '../repository/settingRepository.js';

export async function addStudent(info, files) {
  const transaction = await sequelize.transaction();
  try {
    // Upload files and update info object
    const uploadPromises = Object.keys(files).map(async key => {
      const file = files[key];
      const s3Response = await uploadFile(file);
      info[key] = s3Response.Location;
    });

    await Promise.all(uploadPromises);

    // Documents status 
    const settingKey = 'studentDocument';
    const getstudentDocuments = await getSettingValue(settingKey);
    const studentRequiredDocuments = getstudentDocuments.dataValues.setting_value;
    let allFilesUploaded = true;
    for (let i = 0; i < studentRequiredDocuments.length; i++) {
      const key = studentRequiredDocuments[i];
      if (!info[key]) {
        allFilesUploaded = false;
        break;
      }
    }

    if (allFilesUploaded) {
      info.documentStatus = 'Complete Documents';
    }

    info.scholarNumber = await generateScholarNumber(info.courseId,info.instituteId);
    info.email = info.email.toLowerCase();
    const newStudent = await studentRepository.addStudent(info, { transaction });
    await transaction.commit();
    return newStudent;
  } catch (error) {
    await transaction.rollback();
    console.error('Error adding student:', error);
    throw error;
  }
}

async function generateScholarNumber(courseId,instituteId) {
  const getCourseCodeDetail = await getCourseCode(courseId);
  const getInstitueCodeDetail = await getInstituteCode(instituteId);
  const courseCode = getCourseCodeDetail.get('course_code');
  const institueCode = getInstitueCodeDetail.get('institute_code');
  const getPreviousScholarNumber = await studentRepository.getPreviousScholarNumber(institueCode);
  const previousScholarNumber = getPreviousScholarNumber ? getPreviousScholarNumber.get('scholar_number') : null;
  let scholarNumber;
  if (previousScholarNumber) {
    const scholarNumberParts = previousScholarNumber.split('/');
    const scholarNumberPrefix = scholarNumberParts.slice(0, 3).join('/');
    const scholarNumberSuffix = parseInt(scholarNumberParts[3]) + 1;
    scholarNumber = `${scholarNumberPrefix}/${scholarNumberSuffix.toString().padStart(6, '0')}`;
  } else {
    const yearLastTwoDigits = moment().format('YY');
    scholarNumber = `${institueCode}/${courseCode}/${yearLastTwoDigits}/100001`;
  }
  return scholarNumber;
};

export async function getAllStudents(search){
    return await studentRepository.getAllStudents(search)
};

export async function getSingleStudentDetail(studentId){
    return await studentRepository.getSingleStudentDetail(studentId)
};

export async function importStudentData(fileType,file){
    try {
        let data;
        if (fileType === 'csv') {
          data = await fileHandler.readCSV(file);
        } else if (fileType === 'xlsx' || fileType === 'xls') {
          data = await fileHandler.readExcel(file);
        } else {
          throw new Error('Unsupported file type');
        }
         await addAdmissionNoForBulkImport(data)
      } catch (error) {
        throw new Error('Error importing file data: ' + error.message);
      }
};

export async function addAdmissionNoForBulkImport(data) {
  try {
    const results = [];
    for (const bulk of data) {
      const scholarNumber = await generateScholarNumber(bulk.courseId,bulk.instituteId);
      const studentData = { ...bulk,scholarNumber};
      const result = await studentRepository.addStudent(studentData);
      results.push(result); 
    }
    return results; 
  } catch (error) {
    console.error("Error in Adding AdmissionNumber in bulk Import:", error.message);
    throw error;
  }
};


export async function updateStudentDetails(StudentId, info, files) {
  const transaction = await sequelize.transaction();
  const settingKey = 'studentDocument';
  const getstudentDocuments = await getSettingValue(settingKey);
  console.log(`>>>>>>>>getstudentDocuments>>>>>>..`,getstudentDocuments);
  const studentRequiredDocuments = getstudentDocuments.dataValues.setting_value;
  try {
    if (files && typeof files === 'object') {
      // Upload files and update info object
      const uploadPromises = Object.keys(files).map(async key => {
        const file = files[key];
        if (file) {
          const s3Response = await uploadFile(file);
          info[key] = s3Response.Location;
        }
      });
      await Promise.all(uploadPromises);
    }

    //update documents status
    let allFilesUploaded = true;
    for (let i = 0; i < studentRequiredDocuments.length; i++) {
      const key = studentRequiredDocuments[i];
      if (!info[key]) {
        allFilesUploaded = false;
        break;
      }
    }

    if (allFilesUploaded) {
      info.documentStatus = 'Complete Documents';
    }

    const result = await studentRepository.updateStudentDetails(StudentId, info, { transaction });
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating student:', error);
    throw error;
  }
};

export async function deleteStudentDetail(studentId) {
  try {
    const result = await studentRepository.deleteStudentDetail(studentId);
    if (result) {
      return { message: 'Student deleted successfully' };
    } else {
      return { message: 'No student found with the given ID' };
    }
  } catch (error) {
    console.error('Error deleting student:', error);
    return { message: 'An error occurred while trying to delete the student', error: error.message };
  }
};

export async function getEmptyEnrollNumber(){
  return await studentRepository.getEmptyEnrollNumber()
};