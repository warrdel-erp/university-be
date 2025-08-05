import { getCourseCode,getInstituteCode } from '../repository/collegeRepository.js';
import * as studentRepository from '../repository/studentRepository.js';
import * as fileHandler from '../utility/fileHandler.js';
import moment from 'moment';
import { uploadFile } from '../utility/awsServices.js';
import sequelize from '../database/sequelizeConfig.js';
import { getSettingValue } from '../repository/settingRepository.js';
import {getEmployeeCodesTypesForStudentImport} from '../repository/codeMasterRepository.js'
import { getCourseByName,getClassByName } from '../repository/courseRepository.js';
import {studentRegister} from '../services/userServices.js';
import * as acedmicYearCreationService  from "../repository/acedmicYearRepository.js";
import { findByPlanId } from '../repository/feePlanRepository.js';

export async function addStudent(info, files,createdBy,universityId,roleId,acedmicYearId,classSectionId,semesterId,sessionId) {
  const transaction = await sequelize.transaction();
  try {
    // Upload files and update info object
    if (files && Object.keys(files).length > 0) {
      const uploadPromises = Object.keys(files).map(async key => {
        const file = files[key];
        const s3Response = await uploadFile(file);
        info[key] = s3Response.Location;
      });

      await Promise.all(uploadPromises);
    }
    
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
    const student = await studentRepository.addStudent(info,  transaction );
    const studentId = student.dataValues.studentId;
    const feePlanId = student.dataValues.feePlanId

    const {  email, phoneNumber, mobileNumber, scholarNumber } = student.dataValues;
    const role = 'Student';
    const registerStudentData = { studentId, email, phoneNumber, mobileNumber, scholarNumber, role,universityId,roleId };

    const data = {studentId,acedmicYearId,createdBy,semesterId,sessionId}
    const result = await studentRepository.classStudentMapping(data, transaction);
    //  entranceDetails
    let entranceDetails = [];
    if (info.entranceDetails) {
      const entranceDetailsArray = typeof info.entranceDetails === 'string'
        ? JSON.parse(info.entranceDetails)
        : info.entranceDetails;

      if (Array.isArray(entranceDetailsArray)) {
        entranceDetails = entranceDetailsArray.map(detail => ({ ...detail, studentId,createdBy }));
        await studentRepository.addStudentsEntranceDetail(entranceDetails,  transaction );
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
        addressDetails = await studentRepository.addStudentsAddress(addressDetailsObject,  transaction );
      } else {
        throw new Error('Address details should be an object.');
      }
    }

    // cors AddressDetails
    let CorsAddressDetails = null;
    if (info.corsAddress) {
      const addressDetailsObject = typeof info.corsAddress === 'string'
        ? JSON.parse(info.corsAddress)
        : info.corsAddress;

      if (typeof addressDetailsObject === 'object' && !Array.isArray(addressDetailsObject)) {
        addressDetailsObject.studentId = studentId;
        addressDetailsObject.createdBy = createdBy;
        CorsAddressDetails = await studentRepository.addStudentsCorsAddress(addressDetailsObject, transaction);
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

        allDropDownData = await studentRepository.studentMetaData(entries,  transaction );
      } else {
        throw new Error('Invalid format for allDropDownData.');
      }
    }

    //student register
    await studentRegister (registerStudentData,transaction)

    // student Invoice mapping

    const InvoiceData = {studentId,feePlanId,universityId,createdBy,updatedBy:createdBy}
    const getInvoice = await findByPlanId(feePlanId)
    const dataToInsert = getInvoice.map(invoice => ({
      studentId,
      universityId,
      feePlanId,
      feeNewInvoiceId: invoice.feeNewInvoiceId,
      invoiceStatus: false,
      createdBy,
      updatedBy :createdBy
    }));
    await studentRepository.addStudentInvoiceMapper(dataToInsert,transaction)

    await transaction.commit();
    return { student, entranceDetails, addressDetails,CorsAddressDetails, allDropDownData };
  } catch (error) {
    await transaction.rollback();
    console.error('Error adding student:', error);
    throw error;
  };
};

async function abc(studentId,feePlanId,universityId,createdBy,updatedBy) {
  
}
abc(1,12,2,2,2)

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

export async function getAllStudents(search, universityId, acedmicYearId, page, limit,instituteId,role) {
    try {
        return await studentRepository.getAllStudents(search, universityId, acedmicYearId, page, limit,instituteId,role);
    } catch (error) {
        console.error("Error in studentService.getAllStudents:", error);
        throw error;
    }
};

export async function getSingleStudentDetail(studentId,universityId){
    return await studentRepository.getSingleStudentDetail(studentId,universityId)
};

export async function importStudentData(excelData, data) {
  try {
    const transaction = await sequelize.transaction();
    const matchedPairs = [];
    const metaDataEntries = [];
    const studentMapping = [];

    // Fetch employee codes and types
    const codeAndType = await getEmployeeCodesTypesForStudentImport();

    // Create a lookup map for quick access
    const codeMasterLookup = codeAndType.reduce((acc, item) => {
      acc[item.codeMasterType.toLowerCase()] = item;
      return acc;
    }, {});

    // Process each student data
    const allData = await Promise.all(excelData.map(async (student) => {
      const convertedData = { ...student, ...data };

      // Fetch course and class data
      // const course = await getCourseByName(convertedData?.Course);
      const classDetail = await getClassByName(convertedData?.Class, convertedData?.Section);
      // convertedData['courseId'] = course?.dataValues?.courseId;
      // delete convertedData['Course'];

      // Match and process each field
      for (let key in convertedData) {
        const matchedCodeMaster = codeMasterLookup[key.toLowerCase()];
        if (matchedCodeMaster) {
          const matchingCodes = matchedCodeMaster.codes.filter(codeObj =>
            codeObj.code.toLowerCase() === convertedData[key].toLowerCase()
          );

          matchingCodes.forEach(matchedCode => {
            matchedPairs.push({
              dataId: matchedCodeMaster.employeeCodeMasterId,
              codeId: matchedCode.employeeCodeMasterTypeId
            });

            if (key.toLowerCase() === 'courselevel') {
              convertedData['courseLevelId'] = matchedCode.employeeCodeMasterTypeId;
              delete convertedData['CourseLevel'];
            }
          });
        }
      }

      convertedData.annualIncome = 0;

      // Save student data
      const result = await studentRepository.addStudentExcel(convertedData, transaction);

      // Save matched code data
      for (const pair of matchedPairs) {
        metaDataEntries.push({
          studentId: result.dataValues.studentId,
          codes: pair.dataId,
          types: pair.codeId,
          createdBy: result.dataValues.createdBy
        });
      }

      // Save student mapping data after processing all students
      for (const pair of classDetail) {
        studentMapping.push({
          studentId: result.dataValues.studentId,
          classSectionId: pair.classSectionsId,
          createdBy: result.dataValues.createdBy,
          acedmicYearId: result.dataValues.acedmicYearId
        });
      }

      return convertedData;
    }));

    // Insert all student mappings at once after processing all students
    if (studentMapping.length > 0) {
      await studentRepository.classStudentMappingExcel(studentMapping, transaction);
    }

    // if (metaDataEntries.length > 0) {
    //   await studentRepository.studentMetaData(metaDataEntries, transaction);
    // }

    return { matchedPairs, allData };
  } catch (error) {
    console.error('Error in importing student data:', error);
    throw error;
  }
};

export async function addAdmissionNoForBulkImport(data, matchedPairs) {
  const transaction = await sequelize.transaction();
  try {
    const results = [];
    const metaDataEntries = []; 
    let createdBy = '';

    for (const bulk of data) {
      const scholarNumber = await generateScholarNumber(bulk.courseId, bulk.instituteId);
        createdBy = bulk.createdBy
      const studentData = { ...bulk, scholarNumber };

      const result = await studentRepository.addStudent(studentData, transaction);

      for (const pair of matchedPairs) {
        const entries = {
          studentId: result.dataValues.studentId,  
          codes: pair.dataId,                      
          types: pair.codeId,
          createdBy                       
        };

        metaDataEntries.push(entries);
      }

      results.push(result);
    }

    if (metaDataEntries.length > 0) {
      // await studentRepository.studentMetaData(metaDataEntries, transaction);
    }

    // Commit the transaction after all operations
    await transaction.commit();
    return results;
    
  } catch (error) {
    // If there's an error, roll back the transaction
    await transaction.rollback();
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
    const student = await studentRepository.updateStudentDetails(StudentId, info,  transaction );

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
            entranceDetails =  await studentRepository.updateStudentEntranceDetails(studentsEntranceDetailId, allDetails,  transaction );
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
          addressDetails =  await studentRepository.updateStudentAddressDetails(studentsAddressId, allDetails,  transaction );
        }
      } else {
        throw new Error('Address details should be an object.');
      }
    }

    // Update Cors AddressDetails
    let corsAddressDetails = null;
    if (info.corsAddress) {
      const addressDetailsObject = typeof info.corsAddress === 'string'
        ? JSON.parse(info.corsAddress)
        : info.corsAddress;

      if (typeof addressDetailsObject === 'object' && !Array.isArray(addressDetailsObject)) {
        const { studentCorAddressId, ...allDetails } = addressDetailsObject;
        if (studentCorAddressId) {
          corsAddressDetails =  await studentRepository.updateStudentCorsAddressDetails(studentCorAddressId, allDetails,  transaction );
        }
      } else {
        throw new Error('cors Address details should be an object.');
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
          allDropDownData =  await studentRepository.updateStudentMetaData(studentId, type[i], code[i], transaction);
      }
    }
    await transaction.commit();
    const result = { student, entranceDetails, addressDetails,corsAddressDetails,allDropDownData};
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

export async function getEmptyEnrollNumber(universityId,acedmicYearId,instituteId,role){
  return await studentRepository.getEmptyEnrollNumber(universityId,acedmicYearId,instituteId,role)
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

export async function getclassStudentMapping(semesterId,universityId,acedmicYearId,instituteId,role){
  return await studentRepository.getclassStudentMapping(semesterId,universityId,acedmicYearId,instituteId,role)
};

export async function addElectiveSubject(data,createdBy){
  data.createdBy = createdBy;
  return await studentRepository.addElectiveSubject(data)
};

export async function promoteStudent(data) {
  if(data){
        return { message: 'next acedmic year is active for promate the student and semester is required' };
  }
  console.log(`Incoming data:`, data);

  const studentDetail = await studentRepository.getStudentForPromate(data.studentId);
  console.log(`Student Detail:`, studentDetail);

  const courseId = studentDetail.dataValues.course_id;
  console.log(`Course ID:`, courseId);

  const currentAcademicYearId = studentDetail.dataValues.acedmic_year_id;
  console.log(`Current Academic Year ID:`, currentAcademicYearId);

  const allSemestersRaw = await studentRepository.getSemesterByCourseId(courseId);
  console.log(`Raw Semester Data:`, allSemestersRaw);

  const allAcedmicYears = await acedmicYearCreationService.getacedmicYearDetails();
  console.log(`All Academic Years:`, allAcedmicYears.map(a => a.dataValues));

  //  Ensure semesters are in array format
  const allSemesters = Array.isArray(allSemestersRaw)
    ? allSemestersRaw
    : [allSemestersRaw];    

  console.log(`Converted Semesters Array:`, allSemesters.map(s => s.name));

  //  Sort semesters by ID (or name if needed)
  const sortedSemesters = allSemesters.sort((a, b) => a.semesterId - b.semesterId);
  
  console.log(`Sorted Semesters:`, sortedSemesters.map(s => s.name));

  //  Find current semester index
  const currentSemesterIndex = sortedSemesters.findIndex(
    sem => sem.semesterId === data.semesterId
  );
  console.log(`Current Semester Index:`, currentSemesterIndex);

  if (currentSemesterIndex === -1) {
    console.log(`Semester ID ${data.semesterId} not found`);
    return { message: 'Invalid semester ID for student' };
  }

  //  Get current semester object
  const currentSemester = sortedSemesters[currentSemesterIndex];
  console.log(`Current Semester:`, currentSemester.dataValues.name);

  const nextSemester = sortedSemesters[currentSemesterIndex + 1];
  console.log(`Next Semester:`, nextSemester?.dataValues?.name || 'No more semesters');

  let nextAcedmicYearId = currentAcademicYearId;

  //  Determine how many semesters per academic year
  const semPerYear = 12 / currentSemester.dataValues.semesterDuration;
  console.log(` Semesters per Academic Year:`, semPerYear);

  //  Check if promotion crosses to next academic year
  if ((currentSemesterIndex + 1) % semPerYear === 0) {
    // Move to next academic year
    const currentAcedmicYearObj = allAcedmicYears.find(
      a => a.dataValues.acedmicYearId === currentAcademicYearId
    );
    const currentIndex = allAcedmicYears.indexOf(currentAcedmicYearObj);
    console.log(`Current Academic Year Index:`, currentIndex);

    if (currentIndex !== -1 && currentIndex + 1 < allAcedmicYears.length) {
      nextAcedmicYearId = allAcedmicYears[currentIndex + 1].dataValues.acedmicYearId;
      console.log(`Promoting to Next Academic Year ID:`, nextAcedmicYearId);
    } else {
      console.log(`No next academic year found`);
    }
  }

  if (!nextSemester) {
    console.log(`Student has completed all semesters`);
    return { message: 'Student has completed all semesters' };
  }

  //  Update student mapping in DB
  const result = await studentRepository.promoteStudent(data.studentId, {
    semesterId: nextSemester.semesterId,
    acedmicYearId: nextAcedmicYearId,
    classSectionId: data.classSectionId, // if needed
  });

  console.log(`Student promoted successfully:`, result);

  return { message: 'Student promoted', result };
};