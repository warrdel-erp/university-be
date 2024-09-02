import { getCourseCode,getInstituteCode } from '../repository/collegeRepository.js';
import * as studentRepository from '../repository/studentRepository.js';
import * as fileHandler from '../utility/fileHandler.js';
import moment from 'moment';
import { uploadFile } from '../utility/awsServices.js';
import sequelize from '../database/sequelizeConfig.js';
import { getSettingValue } from '../repository/settingRepository.js';

export async function addStudent(info, files,createdBy) {
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

    // Scholar number
    info.scholarNumber = await generateScholarNumber(info.courseId, info.instituteId);
    info.email = info.email.toLowerCase();
    info.createdBy = createdBy;
    
    // Save student information
    const student = await studentRepository.addStudent(info, { transaction });
    const studentId = student.dataValues.studentId;

    //  entranceDetails
    let entranceDetails = [];
    if (info.entranceDetails) {
      const entranceDetailsArray = typeof info.entranceDetails === 'string'
        ? JSON.parse(info.entranceDetails)
        : info.entranceDetails;

      if (Array.isArray(entranceDetailsArray)) {
        entranceDetails = entranceDetailsArray.map(detail => ({ ...detail, studentId,createdBy }));
        await studentRepository.addStudentsEntranceDetail(entranceDetails, { transaction });
      } else {
        throw new Error('Entrance details should be an array.');
      }
    }

    //  addressDetails
    let addressDetails = null;
    if (info.addressDetails) {
      const addressDetailsObject = typeof info.addressDetails === 'string'
        ? JSON.parse(info.addressDetails)
        : info.addressDetails;

      if (typeof addressDetailsObject === 'object' && !Array.isArray(addressDetailsObject)) {
        addressDetailsObject.studentId = studentId;
        addressDetailsObject.createdBy = createdBy;
        addressDetails = await studentRepository.addStudentsAddress(addressDetailsObject, { transaction });
      } else {
        throw new Error('Address details should be an object.');
      }
    }

    //  allDropDownData
    let allDropDownData = null;
    if (info.allDropDownData) {
      const allDropDownDataObject = typeof info.allDropDownData === 'string'
        ? JSON.parse(info.allDropDownData)
        : info.allDropDownData;

      if (typeof allDropDownDataObject === 'object' && Array.isArray(allDropDownDataObject.type) && Array.isArray(allDropDownDataObject.code)) {
        const type = allDropDownDataObject.type;
        const code = allDropDownDataObject.code;

        if (type.length !== code.length) {
          throw new Error('Types and codes arrays must be of the same length.');
        }

        const entries = type.map((types, index) => ({
          studentId,
          createdBy,
          types,
          codes: code[index]
        }));

        allDropDownData = await studentRepository.studentMetaData(entries, { transaction });
      } else {
        throw new Error('Invalid format for allDropDownData.');
      }
    }

    await transaction.commit();
    return { student, entranceDetails, addressDetails, allDropDownData };
  } catch (error) {
    await transaction.rollback();
    console.error('Error adding student:', error);
    throw error;
  };
};

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

export async function getAllStudents(search,universityId){
    return await studentRepository.getAllStudents(search,universityId)
};

export async function getSingleStudentDetail(studentId,universityId){
    return await studentRepository.getSingleStudentDetail(studentId,universityId)
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
  const studentRequiredDocuments = getstudentDocuments.setting_value;
  
  try {
    // Upload files if present
    if (files && typeof files === 'object') {
      for (const key of Object.keys(files)) {
        const file = files[key];
        if (file) {
          const s3Response = await uploadFile(file);
          info[key] = s3Response.Location;
        }
      }
    }

    // Update documents status
    const allFilesUploaded = studentRequiredDocuments?.every(key => info[key]);
    if (allFilesUploaded) {
      info.documentStatus = 'Complete Documents';
    }

    // Update student details
    const student = await studentRepository.updateStudentDetails(StudentId, info, { transaction });

    // Update entranceDetails
    let entranceDetails = [];
    if (info.entranceDetails) {
      const entranceDetailsArray = typeof info.entranceDetails === 'string'
        ? JSON.parse(info.entranceDetails)
        : info.entranceDetails;

      if (Array.isArray(entranceDetailsArray)) {
        for (const detail of entranceDetailsArray) {
          const { studentsEntranceDetailId, ...allDetails } = detail;
          if (studentsEntranceDetailId) {
            entranceDetails =  await studentRepository.updateStudentEntranceDetails(studentsEntranceDetailId, allDetails, { transaction });
          }
        }
      }
    }

    // Update addressDetails
    let addressDetails = null;
    if (info.addressDetails) {
      const addressDetailsObject = typeof info.addressDetails === 'string'
        ? JSON.parse(info.addressDetails)
        : info.addressDetails;

      if (typeof addressDetailsObject === 'object' && !Array.isArray(addressDetailsObject)) {
        const { studentsAddressId, ...allDetails } = addressDetailsObject;
        if (studentsAddressId) {
          addressDetails =  await studentRepository.updateStudentAddressDetails(studentsAddressId, allDetails, { transaction });
        }
      } else {
        throw new Error('Address details should be an object.');
      }
    }

    // update all dropDown
    let allDropDownData = null;
    if (info.allDropDownData) {
      const data = JSON.parse(info.allDropDownData);
      const { studentId, type, code } = data;
      if (type.length !== code.length) {
        throw new Error('Type and code arrays must be of the same length');
      }
        for (let i = 0; i < type.length; i++) {
          allDropDownData =  await studentRepository.updateStudentMetaData(studentId, type[i], code[i], {transaction});
      }
    }
    await transaction.commit();
    const result = { student, entranceDetails, addressDetails,allDropDownData};
    return result;
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating student:', error);
    throw error;
  }
};

export async function deleteStudentDetail(studentId) {
  try {
    // Fetch entrance and address details in parallel
    const [entranceDetails, addressDetails] = await Promise.all([
      studentRepository.findEntranceDetailsByStudentId(studentId),
      studentRepository.findStudentAddressByStudentId(studentId)
    ]);

    // Extract IDs
    const entranceIds = entranceDetails.map(detail => detail.dataValues.students_entrance_detail_id);
    const addressId = addressDetails?.dataValues?.students_address_id;

    // Perform deletions in parallel
    const [deleteEntranceResult, deleteAddressResult, deleteStudentResult] = await Promise.all([
      studentRepository.deleteStudentEntranceDetail(entranceIds),
      studentRepository.deleteStudentAddressDetail(addressId),
      studentRepository.deleteStudentDetail(studentId)
    ]);

    // Check if all deletions successful
    if (deleteEntranceResult && deleteAddressResult && deleteStudentResult) {
      return { message: 'Student and related records deleted successfully' };
    } else {
      return { message: 'Some records were not found or not deleted' };
    }
  } catch (error) {
    console.error('Error deleting student:', error);
    return { message: 'An error occurred while trying to delete the student', error: error.message };
  }
};

export async function getEmptyEnrollNumber(universityId){
  return await studentRepository.getEmptyEnrollNumber(universityId)
};

export async function studentCourseMapping(data){
  return await studentRepository.studentCourseMapping(data)
};

export async function classStudentMapping(data, createdBy) {
  try {
    const { studentId, classSectionId} = data;
    const results = [];

    for (const id of studentId) {
      const entryData = { studentId: id, classSectionId, createdBy };
      const result = await studentRepository.classStudentMapping(entryData);
      results.push(result);
    }
    
    return results;
  } catch (error) {
    console.error('Error in classStudentMapping:', error);
    throw error;
  }
}; 

export async function getclassStudentMapping(classSectionId,universityId){
  return await studentRepository.getclassStudentMapping(classSectionId,universityId)
};

export async function addElectiveSubject(data){
  return await studentRepository.addElectiveSubject(data)
};