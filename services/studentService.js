import {
  getCourseCode,
  getInstituteCode,
} from "../repository/collegeRepository.js";
import * as studentRepository from "../repository/studentRepository.js";
import * as historyRepository from "../repository/studentClassSectionsHistoryRepository.js";
import * as fileHandler from "../utility/fileHandler.js";
import moment from "moment";
import { uploadFile } from "../utility/awsServices.js";
import sequelize from "../database/sequelizeConfig.js";
import { getSettingValue } from "../repository/settingRepository.js";
import { getEmployeeCodesTypesForStudentImport } from "../repository/codeMasterRepository.js";
import {
  getCourseByName,
  getClassByName,
} from "../repository/courseRepository.js";
import { studentRegister } from "../services/userServices.js";
import * as acedmicYearCreationService from "../repository/acedmicYearRepository.js";
import * as feePlanProfileRepository from "../repository/feePlanProfileRepository.js";
import * as roleRepository from "../repository/roleRepository.js";
import { parseCustomDate } from "../utility/dateFormat.js";
import * as feeInvoiceRepository from "../repository/feeInvoiceRepository.js";
import * as libraryRepository from "../repository/libraryCreationRepository.js";
import * as timeTableCreateRepository from "../repository/timeTablecreateRepository.js";
import * as model from "../models/index.js";
import { decimalAdd, decimalSum, toMoneyNumber } from "../utility/decimalMoney.js";
import { FEE_PLAN_PUBLISH_STATUS } from "../constant.js";

function isMainFeePlanSubItem(line) {
  return line?.isMainSubItem === true || line?.isMainSubItem === 1;
}

function splitFeePlanSubItemAmounts(subItems) {
  let amount = 0;
  let supplementalFees = 0;

  for (const line of subItems ?? []) {
    const lineAmount = toMoneyNumber(line.amount);
    if (isMainFeePlanSubItem(line)) {
      amount = decimalAdd(amount, lineAmount);
    } else {
      supplementalFees = decimalAdd(supplementalFees, lineAmount);
    }
  }

  return {
    amount,
    supplementalFees,
    total: decimalAdd(amount, supplementalFees),
  };
}

function mapFeePlanSubItemsForResponse(subItems) {
  return (subItems ?? []).map((line) => ({
    feePlanSubitemId: line.feePlanSubitemId,
    feeTypeId: line.feeTypeId,
    name: line.feeTypeCatalog?.name ?? null,
    ledgerType: line.feeTypeCatalog?.ledgerType ?? null,
    amount: toMoneyNumber(line.amount),
    isMainItem: isMainFeePlanSubItem(line),
  }));
}

export async function addStudent(
  info,
  files,
  createdBy,
  universityId,
  roleId,
  acedmicYearId,
  classSectionId,
  semesterId,
  sessionId,
) {
  const transaction = await sequelize.transaction();
  try {
    // Upload files and update info object
    if (files && Object.keys(files).length > 0) {
      const uploadPromises = Object.keys(files).map(async (key) => {
        const file = files[key];
        const s3Response = await uploadFile(file);
        info[key] = s3Response.Location;
      });

      await Promise.all(uploadPromises);
    }

    // Documents status
    const settingKey = "studentDocument";
    const getstudentDocuments = await getSettingValue(settingKey);
    const studentRequiredDocuments =
      getstudentDocuments?.dataValues?.setting_value;
    let allFilesUploaded = true;
    for (let i = 0; i < studentRequiredDocuments?.length; i++) {
      const key = studentRequiredDocuments[i];
      if (!info[key]) {
        allFilesUploaded = false;
        break;
      }
    }

    if (allFilesUploaded) {
      info.documentStatus = "Complete Documents";
    }

    // Scholar number
    info.scholarNumber = await generateScholarNumber(
      info.courseId,
      info.instituteId,
    );
    info.email = info.email.toLowerCase();
    info.createdBy = createdBy;

    delete info.semesterId;

    const studentPayload = { ...info };
    for (const key of [
      "entranceDetails",
      "addressDetails",
      "corsAddress",
      "allDropDownData",
      "roleId",
    ]) {
      delete studentPayload[key];
    }

    // Save student information
    const student = await studentRepository.addStudent(studentPayload, transaction);
    const studentId = student.dataValues.studentId;

    const { email, phoneNumber, mobileNumber, scholarNumber } =
      student.dataValues;
    const role = "Student";
    const registerStudentData = {
      studentId,
      email,
      phoneNumber,
      mobileNumber,
      scholarNumber,
      role,
      universityId,
      roleId,
    };

    const data = { studentId, acedmicYearId, createdBy, sessionId };
    const result = await studentRepository.classStudentMapping(
      data,
      transaction,
    );

    // Record in history
    await historyRepository.createHistory(
      {
        studentId,
        classSectionsId: classSectionId,
        status: "current",
        createdBy,
      },
      transaction,
    );
    //  entranceDetails
    let entranceDetails = [];
    if (info.entranceDetails) {
      const entranceDetailsArray =
        typeof info.entranceDetails === "string"
          ? JSON.parse(info.entranceDetails)
          : info.entranceDetails;

      if (Array.isArray(entranceDetailsArray)) {
        entranceDetails = entranceDetailsArray.map((detail) => ({
          ...detail,
          studentId,
          createdBy,
        }));
        await studentRepository.addStudentsEntranceDetail(
          entranceDetails,
          transaction,
        );
      } else {
        throw new Error("Entrance details should be an array.");
      }
    }

    //  addressDetails
    let addressDetails = null;
    if (info.addressDetails) {
      const addressDetailsObject =
        typeof info.addressDetails === "string"
          ? JSON.parse(info.addressDetails)
          : info.addressDetails;

      if (
        typeof addressDetailsObject === "object" &&
        !Array.isArray(addressDetailsObject)
      ) {
        addressDetailsObject.studentId = studentId;
        addressDetailsObject.createdBy = createdBy;
        addressDetails = await studentRepository.addStudentsAddress(
          addressDetailsObject,
          transaction,
        );
      } else {
        throw new Error("Address details should be an object.");
      }
    }

    // cors AddressDetails
    let CorsAddressDetails = null;
    if (info.corsAddress) {
      const addressDetailsObject =
        typeof info.corsAddress === "string"
          ? JSON.parse(info.corsAddress)
          : info.corsAddress;

      if (
        typeof addressDetailsObject === "object" &&
        !Array.isArray(addressDetailsObject)
      ) {
        addressDetailsObject.studentId = studentId;
        addressDetailsObject.createdBy = createdBy;
        CorsAddressDetails = await studentRepository.addStudentsCorsAddress(
          addressDetailsObject,
          transaction,
        );
      } else {
        throw new Error("Address details should be an object.");
      }
    }
    //  allDropDownData
    let allDropDownData = null;
    if (info.allDropDownData) {
      const allDropDownDataObject =
        typeof info.allDropDownData === "string"
          ? JSON.parse(info.allDropDownData)
          : info.allDropDownData;

      if (
        typeof allDropDownDataObject === "object" &&
        Array.isArray(allDropDownDataObject.type) &&
        Array.isArray(allDropDownDataObject.code)
      ) {
        const type = allDropDownDataObject.type;
        const code = allDropDownDataObject.code;

        if (type.length !== code.length) {
          throw new Error("Types and codes arrays must be of the same length.");
        }

        const entries = type.map((types, index) => ({
          studentId,
          createdBy,
          types,
          codes: code[index],
        }));

        allDropDownData = await studentRepository.studentMetaData(
          entries,
          transaction,
        );
      } else {
        throw new Error("Invalid format for allDropDownData.");
      }
    }

    //student register
    const userId = await studentRegister(registerStudentData, transaction);

    // Update student with userId
    await studentRepository.updateStudentDetails(
      studentId,
      { userId },
      transaction,
    );

    await transaction.commit();

    const plainStudent =
      typeof student.get === "function" ? student.get({ plain: true }) : student;

    return {
      studentId: plainStudent.studentId,
      feePlanProfileId: plainStudent.feePlanProfileId,
      scholarNumber: plainStudent.scholarNumber,
      enrollNumber: plainStudent.enrollNumber,
      email: plainStudent.email,
      firstName: plainStudent.firstName,
      lastName: plainStudent.lastName,
      classSectionsId: plainStudent.classSectionsId,
      courseId: plainStudent.courseId,
      sessionId: plainStudent.sessionId,
      acedmicYearId: plainStudent.acedmicYearId,
      userId,
      student: plainStudent,
      entranceDetails,
      addressDetails,
      corsAddressDetails: CorsAddressDetails,
      allDropDownData,
    };
  } catch (error) {
    await transaction.rollback();
    console.error("Error adding student:", error);
    throw error;
  }
}

function studentHttpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function assertFeePlanProfileForInstitute(feePlanProfileId) {
  const profile = await feePlanProfileRepository.findFeePlanProfileByIdForInstitute(
    feePlanProfileId
  );
  if (!profile) {
    throw studentHttpError("Fee plan profile not found for this institute", 404);
  }
  const plain =
    typeof profile.get === "function" ? profile.get({ plain: true }) : profile;
  if (plain.publishStatus !== FEE_PLAN_PUBLISH_STATUS.PUBLISHED) {
    throw studentHttpError("Only published fee plans can be assigned to students", 400);
  }
}

async function assertStudentEnrollNumberAvailable(enrollNumber) {
  if (!enrollNumber) return;
  const existing =
    await studentRepository.findStudentByEnrollNumber(enrollNumber);
  if (
    existing &&
    enrollNumber.toLowerCase() ===
      existing.dataValues.enroll_number.toLowerCase()
  ) {
    throw new Error("Enrollment number is already existing");
  }
}

async function assertStudentEmailAvailable(email) {
  if (!email) {
    throw new Error("Email is required");
  }
  const existing = await studentRepository.findStudentByEmail(email);
  if (
    existing &&
    email.toLowerCase() === existing.dataValues.email.toLowerCase()
  ) {
    throw new Error("Email is already existing");
  }
}

async function resolveStudentRoleId() {
  const roleId = await roleRepository.findStudentRoleId();
  if (!roleId) throw new Error("STUDENT role not found in role table");
  return roleId;
}

export async function addStudentWithFeePlanProfile({ info, files, createdBy }) {
  await assertFeePlanProfileForInstitute(info.feePlanProfileId);
  await assertStudentEmailAvailable(info.email);
  await assertStudentEnrollNumberAvailable(info.enrollNumber);

  const {
    universityId,
    acedmicYearId,
    classSectionsId: classSectionId,
    sessionId,
    semesterId,
  } = info;

  const roleId = await resolveStudentRoleId();

  return addStudent(
    info,
    files,
    createdBy,
    universityId,
    roleId,
    acedmicYearId,
    classSectionId,
    semesterId,
    sessionId,
  );
}

async function generateScholarNumber(courseId, instituteId) {
  const getCourseCodeDetail = await getCourseCode(courseId);
  const getInstitueCodeDetail = await getInstituteCode(instituteId);
  const courseCode = getCourseCodeDetail.get("course_code");
  const institueCode = getInstitueCodeDetail.get("institute_code");
  const getPreviousScholarNumber =
    await studentRepository.getPreviousScholarNumber(institueCode);
  const previousScholarNumber = getPreviousScholarNumber
    ? getPreviousScholarNumber.get("scholar_number")
    : null;
  let scholarNumber;
  if (previousScholarNumber) {
    const scholarNumberParts = previousScholarNumber.split("/");
    const scholarNumberPrefix = scholarNumberParts.slice(0, 3).join("/");
    const scholarNumberSuffix = parseInt(scholarNumberParts[3]) + 1;
    scholarNumber = `${scholarNumberPrefix}/${scholarNumberSuffix.toString().padStart(6, "0")}`;
  } else {
    const yearLastTwoDigits = moment().format("YY");
    scholarNumber = `${institueCode}/${courseCode}/${yearLastTwoDigits}/100001`;
  }
  return scholarNumber;
}

export async function getAllStudents(payload) {
  try {
    return await studentRepository.getAllStudents(payload);
  } catch (error) {
    console.error("Error in studentService.getAllStudents:", error);
    throw error;
  }
}

export async function getSingleStudentDetail(studentId) {
  return await studentRepository.getSingleStudentDetail(studentId);
}

// export async function importStudentData(excelData, data) {
//   try {
//     const transaction = await sequelize.transaction();

//     const studentMapping = [];

//     // Fetch all employee code master data
//     const codeAndType = await getEmployeeCodesTypesForStudentImport();

//     // Create a lookup map for faster access using lowercase type keys
//     const codeMasterLookup = codeAndType.reduce((acc, item) => {
//       acc[item.codeMasterType.toLowerCase()] = item;
//       return acc;
//     }, {});

//     // Process each student entry
//     const allData = await Promise.all(excelData.map(async (student) => {
//       const convertedData = { ...student, ...data };

//       // Track matched codes for current student
//       const matchedPairs = [];
//       const metaDataEntries = [];

//       // Match each field in the student data with corresponding code master
//       for (const key in convertedData) {
//         const matchedCodeMaster = codeMasterLookup[key.toLowerCase()];
//         if (matchedCodeMaster) {
//           const matchingCodes = matchedCodeMaster.codes.filter(codeObj =>
//             codeObj.code.toLowerCase() === convertedData[key].toLowerCase()
//           );

//           matchingCodes.forEach(matchedCode => {
//             matchedPairs.push({
//               dataId: matchedCodeMaster.employeeCodeMasterId,
//               codeId: matchedCode.employeeCodeMasterTypeId
//             });

//             // Special handling for course level
//             if (key.toLowerCase() === 'courselevel') {
//               convertedData['courseLevelId'] = matchedCode.employeeCodeMasterTypeId;
//               delete convertedData['CourseLevel'];
//             }
//           });
//         }
//       }

//       // Set default income if not provided
//       convertedData.annualIncome = 0;

//       // Save student entry
//       const result = await studentRepository.addStudentExcel(convertedData, transaction);

//       // Prepare meta data entries
//       matchedPairs.forEach(pair => {
//         metaDataEntries.push({
//           studentId: result.dataValues.studentId,
//           codes: pair.dataId,
//           types: pair.codeId,
//           createdBy: result.dataValues.createdBy
//         });
//       });

//       // Prepare student-class mapping
//       studentMapping.push({
//         studentId: result.dataValues.studentId,
//         // Uncomment and populate if class detail is available
//         // classSectionId: classDetail?.classSectionsId,
//         createdBy: result.dataValues.createdBy,
//         acedmicYearId: result.dataValues.acedmicYearId,
//         semesterId: result.dataValues.semesterId,
//         sessionId: result.dataValues.sessionId
//       });

//       // Save metadata if needed
//       // if (metaDataEntries.length > 0) {
//       //   await studentRepository.studentMetaData(metaDataEntries, transaction);
//       // }

//       return convertedData;
//     }));

//     // Insert all student-class mappings in bulk
//     if (studentMapping.length > 0) {
//       await studentRepository.classStudentMappingExcel(studentMapping, transaction);
//     }

//     return { allData };
//   } catch (error) {
//     console.error('Error in importing student data:', error);
//     throw error;
//   }
// };

export async function importStudentData(excelData, data) {
  try {
    const transaction = await sequelize.transaction();

    const studentMapping = [];
    const results = [];

    // Step 1: Fetch all employee code master data
    const codeAndType = await getEmployeeCodesTypesForStudentImport();

    // Step 2: Create a lookup map for quick access
    const codeMasterLookup = codeAndType.reduce((acc, item) => {
      acc[item.codeMasterType.toLowerCase()] = item;
      return acc;
    }, {});

    for (const student of excelData) {
      // Step 3: Merge excel student row with additional payload
      const convertedData = { ...student, ...data };
      const matchedPairs = [];

      // Step 4: Match student data to code master entries
      for (const key in convertedData) {
        const matchedCodeMaster = codeMasterLookup[key.toLowerCase()];
        if (matchedCodeMaster) {
          const matchingCodes = matchedCodeMaster.codes.filter(
            (codeObj) =>
              codeObj.code.toLowerCase() === convertedData[key].toLowerCase(),
          );

          for (const matchedCode of matchingCodes) {
            matchedPairs.push({
              dataId: matchedCodeMaster.employeeCodeMasterId,
              codeId: matchedCode.employeeCodeMasterTypeId,
            });

            if (key.toLowerCase() === "courselevel") {
              convertedData["courseLevelId"] =
                matchedCode.employeeCodeMasterTypeId;
              delete convertedData["CourseLevel"];
            }
          }
        }
      }

      // Step 5: Add default annual income
      convertedData.annualIncome = 0;

      //  Step 6: Generate scholar number BEFORE inserting the student
      const scholarNumberData = await generateScholarNumber(
        convertedData.courseId,
        convertedData.instituteId,
      );
      // convertedData.scholarNumber = scholarNumber;
      const number = convertedData.scholarNumber
        ? convertedData.scholarNumber
        : scholarNumberData;
      convertedData.scholarNumber = number;

      const formatDob = await parseCustomDate(convertedData.birthDate);

      const formatEnrollDate = await parseCustomDate(convertedData.enrollDate);

      const formatAdmissionDate = await parseCustomDate(
        convertedData.admissionDate,
      );

      convertedData.birthDate = formatDob;
      convertedData.enrollDate = formatEnrollDate;
      convertedData.admisssionDate = formatAdmissionDate;

      if (convertedData.feePlanProfileId) {
        await assertFeePlanProfileForInstitute(convertedData.feePlanProfileId);
      }

      //  Step 7: Insert student with scholar number
      const result = await studentRepository.addStudent(
        convertedData,
        transaction,
      );
      // student register
      const role = "Student";
      const roleId = convertedData.roleId || 1;
      const {
        studentId,
        email,
        phoneNumber,
        mobileNumber,
        scholarNumber,
        universityId,
      } = result.dataValues;
      const registerStudentData = {
        studentId,
        email,
        phoneNumber,
        mobileNumber,
        scholarNumber,
        universityId,
        role,
        roleId,
      };
      const userId = await studentRegister(registerStudentData, transaction);

      // Update student with userId
      await studentRepository.updateStudentDetails(
        studentId,
        { userId },
        transaction,
      );

      // Step 8: Prepare student-class mapping
      studentMapping.push({
        studentId: result.dataValues.studentId,
        createdBy: result.dataValues.createdBy,
        acedmicYearId: result.dataValues.acedmicYearId,
        semesterId: result.dataValues.semesterId,
        sessionId: result.dataValues.sessionId,
      });

      // Optional metadata (uncomment if needed)
      const metaDataEntries = matchedPairs.map((pair) => ({
        studentId: result.dataValues.studentId,
        codes: pair.dataId,
        types: pair.codeId,
        createdBy: result.dataValues.createdBy,
      }));
      if (metaDataEntries.length > 0) {
        await studentRepository.studentMetaData(metaDataEntries, transaction);
      }

      // Step 9: Store result
      results.push(result);
    }

    // Step 10: Bulk insert student-class mappings
    if (studentMapping.length > 0) {
      await studentRepository.classStudentMappingExcel(
        studentMapping,
        transaction,
      );

      // Bulk record in history
      const historyEntries = studentMapping.map((mapping) => ({
        studentId: mapping.studentId,
        classSectionsId: data.classSectionsId,
        status: "current",
        createdBy: mapping.createdBy,
      }));
      await historyRepository.bulkCreateHistory(historyEntries, transaction);
    }

    // Step 11: Commit transaction
    await transaction.commit();

    return {
      insertedCount: results.length,
      students: results.map((student) => ({
        studentId: student.dataValues.studentId,
        scholarNumber: student.dataValues.scholarNumber,
        name: student.dataValues.firstName,
        courseId: student.dataValues.courseId,
      })),
    };
  } catch (error) {
    console.error("Error in importing student data:", error);
    throw error;
  }
}

// this correct final
// export async function importStudentData(excelData, data) {
//   try {
//     const transaction = await sequelize.transaction();

//     const studentMapping = [];

//     // Fetch all employee code master data
//     const codeAndType = await getEmployeeCodesTypesForStudentImport();

//     // Create a lookup map for quick access
//     const codeMasterLookup = codeAndType.reduce((acc, item) => {
//       acc[item.codeMasterType.toLowerCase()] = item;
//       return acc;
//     }, {});

//     // Array to collect student data to be inserted
//     const studentsToInsert = [];
//     const allMatchedPairs = [];

//     // Prepare student data and matched codes
//     for (const student of excelData) {
//       const convertedData = { ...student, ...data };
//       const matchedPairs = [];

//       // Match student data to code master entries
//       for (const key in convertedData) {
//         const matchedCodeMaster = codeMasterLookup[key.toLowerCase()];
//         if (matchedCodeMaster) {
//           const matchingCodes = matchedCodeMaster.codes.filter(codeObj =>
//             codeObj.code.toLowerCase() === convertedData[key].toLowerCase()
//           );

//           for (const matchedCode of matchingCodes) {
//             matchedPairs.push({
//               dataId: matchedCodeMaster.employeeCodeMasterId,
//               codeId: matchedCode.employeeCodeMasterTypeId
//             });

//             if (key.toLowerCase() === 'courselevel') {
//               convertedData['courseLevelId'] = matchedCode.employeeCodeMasterTypeId;
//               delete convertedData['CourseLevel'];
//             }
//           }
//         }
//       }

//       // Default value
//       convertedData.annualIncome = 0;

//       // Generate scholar number
//       let scholarNumber = await generateScholarNumber(convertedData.courseId, convertedData.instituteId);
//       convertedData.scholarNumber = scholarNumber;

//       studentsToInsert.push(convertedData);
//       allMatchedPairs.push(matchedPairs);
//     }

//     const results = [];

//     // Insert each student record and map metadata
//     for (let i = 0; i < studentsToInsert.length; i++) {
//       const studentData = studentsToInsert[i];
//       const matchedPairs = allMatchedPairs[i];

//       const result = await studentRepository.addStudent(studentData, transaction);

//       // Student-Class mapping preparation
//       studentMapping.push({
//         studentId: result.dataValues.studentId,
//         createdBy: result.dataValues.createdBy,
//         acedmicYearId: result.dataValues.acedmicYearId,
//         semesterId: result.dataValues.semesterId,
//         sessionId: result.dataValues.sessionId
//       });

//       // Meta data (commented out but ready to be used)
//       // const metaDataEntries = matchedPairs.map(pair => ({
//       //   studentId: result.dataValues.studentId,
//       //   codes: pair.dataId,
//       //   types: pair.codeId,
//       //   createdBy: result.dataValues.createdBy
//       // }));
//       // if (metaDataEntries.length > 0) {
//       //   await studentRepository.studentMetaData(metaDataEntries, transaction);
//       // }

//       results.push(result);
//     }

//     // Bulk insert student-class mappings
//     if (studentMapping.length > 0) {
//       await studentRepository.classStudentMappingExcel(studentMapping, transaction);
//     }

//     await transaction.commit();
//     return { insertedCount: results.length, students: results };

//   } catch (error) {
//     console.error('Error in importing student data:', error);
//     throw error;
//   }
// };

export async function addAdmissionNoForBulkImport(data, matchedPairs) {
  const transaction = await sequelize.transaction();
  try {
    const results = [];
    const metaDataEntries = [];
    let createdBy = "";

    for (const bulk of data) {
      const scholarNumber = await generateScholarNumber(
        bulk.courseId,
        bulk.instituteId,
      );
      createdBy = bulk.createdBy;
      const studentData = { ...bulk, scholarNumber };

      const result = await studentRepository.addStudent(
        studentData,
        transaction,
      );

      for (const pair of matchedPairs) {
        const entries = {
          studentId: result.dataValues.studentId,
          codes: pair.dataId,
          types: pair.codeId,
          createdBy,
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
    console.error(
      "Error in Adding AdmissionNumber in bulk Import:",
      error.message,
    );
    throw error;
  }
}

/** Scalar columns allowed on PATCH — fee v2 does not use semesterId / feePlanId on update. */
const STUDENT_SCALAR_UPDATE_FIELDS = new Set([
  "universityId",
  "campusId",
  "instituteId",
  "affiliatedUniversityId",
  "acedmicYearId",
  "courseLevelId",
  "courseId",
  "specializationId",
  "sessionId",
  "classSectionsId",
  "feePlanProfileId",
  "scholarNumber",
  "enrollNumber",
  "firstName",
  "middleName",
  "lastName",
  "fatherName",
  "motherName",
  "annualIncome",
  "birthDate",
  "admisssionDate",
  "enrollDate",
  "studentAdmissionStatus",
  "currentClass",
  "studentPhoto",
  "signature",
  "phoneNumber",
  "mobileNumber",
  "email",
  "parentEmail",
  "parentNumber",
  "aadharNumber",
  "panNumber",
  "AdditionalNotes",
  "bankName",
  "accountNumber",
  "ifscCode",
  "placeOfBirth",
  "studentStatus",
  "cancelDate",
  "cancelReason",
  "generalRemark",
  "preference",
  "documentStatus",
  "feeStatus",
  "pAddress",
  "pPincode",
  "pCountry",
  "pState",
  "pCity",
  "contact",
  "cAddress",
  "cPincode",
  "cCountry",
  "cState",
  "cCity",
]);

const STUDENT_UPDATE_OPTIONAL_FK_KEYS = new Set([
  "specializationId",
  "feePlanProfileId",
]);

const STUDENT_UPDATE_NUMERIC_FIELDS = new Set([
  "pPincode",
  "cPincode",
  "annualIncome",
]);

function pickStudentUpdatePayload(info) {
  const payload = {};
  for (const key of STUDENT_SCALAR_UPDATE_FIELDS) {
    if (!(key in info)) continue;
    let value = info[key];
    if (value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (STUDENT_UPDATE_OPTIONAL_FK_KEYS.has(key) && (value === null || value === 0)) {
      continue;
    }
    const shouldCoerceNumber =
      (key.endsWith("Id") || STUDENT_UPDATE_NUMERIC_FIELDS.has(key)) &&
      value !== null &&
      typeof value === "string" &&
      /^\d+$/.test(value);
    if (shouldCoerceNumber) {
      value = Number(value);
    }
    payload[key] = value;
  }
  return payload;
}

async function applyStudentMetaDataUpdates(studentId, info, transaction) {
  if (
    !info.allDropDownData ||
    info.allDropDownData === "" ||
    info.allDropDownData === "{}"
  ) {
    return;
  }

  try {
    const data =
      typeof info.allDropDownData === "string"
        ? JSON.parse(info.allDropDownData)
        : info.allDropDownData;
    const type = data?.type;
    const code = data?.code;
    if (!Array.isArray(type) || !Array.isArray(code)) return;

    const len = Math.min(type.length, code.length);
    for (let i = 0; i < len; i++) {
      try {
        await studentRepository.updateStudentMetaData(
          studentId,
          type[i],
          code[i],
          transaction,
        );
      } catch (metaErr) {
        console.error("Student metaData update skipped:", metaErr.message);
      }
    }
  } catch (parseErr) {
    console.error("allDropDownData parse skipped:", parseErr.message);
  }
}

function updateHttpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

export async function updateStudentDetails(StudentId, info, files, instituteId) {
  const transaction = await sequelize.transaction();

  try {
    // Upload files if present
    if (files && typeof files === "object") {
      for (const key of Object.keys(files)) {
        const file = files[key];
        if (file) {
          const s3Response = await uploadFile(file);
          info[key] = s3Response.Location;
        }
      }
    }

    const studentPayload = pickStudentUpdatePayload(info);

    if (studentPayload.feePlanProfileId) {
      const resolvedInstituteId = instituteId ?? studentPayload.instituteId ?? info.instituteId;
      if (!resolvedInstituteId) {
        throw updateHttpError("instituteId is required to assign a fee plan", 400);
      }
      await assertFeePlanProfileForInstitute(studentPayload.feePlanProfileId);
    }

    let rowsUpdated = 0;
    if (Object.keys(studentPayload).length > 0) {
      [rowsUpdated] = await studentRepository.updateStudentDetails(
        StudentId,
        studentPayload,
        transaction,
      );
    }

    // Update entranceDetails
    let entranceDetails = [];
    if (
      info.entranceDetails !== undefined &&
      info.entranceDetails !== null &&
      info.entranceDetails !== "" &&
      info.entranceDetails !== "[]"
    ) {
      const entranceDetailsArray =
        typeof info.entranceDetails === "string"
          ? JSON.parse(info.entranceDetails)
          : info.entranceDetails;

      if (Array.isArray(entranceDetailsArray)) {
        for (const detail of entranceDetailsArray) {
          const { studentsEntranceDetailId, ...allDetails } = detail;
          if (studentsEntranceDetailId) {
            entranceDetails =
              await studentRepository.updateStudentEntranceDetails(
                studentsEntranceDetailId,
                allDetails,
                transaction,
              );
          }
        }
      }
    }

    // Update addressDetails
    let addressDetails = null;
    if (info.addressDetails) {
      const addressDetailsObject =
        typeof info.addressDetails === "string"
          ? JSON.parse(info.addressDetails)
          : info.addressDetails;

      if (
        typeof addressDetailsObject === "object" &&
        !Array.isArray(addressDetailsObject)
      ) {
        const { studentsAddressId, ...allDetails } = addressDetailsObject;
        if (studentsAddressId) {
          addressDetails = await studentRepository.updateStudentAddressDetails(
            studentsAddressId,
            allDetails,
            transaction,
          );
        }
      }
    }

    // Update Cors AddressDetails (optional)
    let corsAddressDetails = null;
    if (info.corsAddress) {
      try {
        const addressDetailsObject =
          typeof info.corsAddress === "string"
            ? JSON.parse(info.corsAddress)
            : info.corsAddress;

        if (
          typeof addressDetailsObject === "object" &&
          !Array.isArray(addressDetailsObject)
        ) {
          const { studentCorAddressId, ...allDetails } = addressDetailsObject;
          if (studentCorAddressId) {
            corsAddressDetails =
              await studentRepository.updateStudentCorsAddressDetails(
                studentCorAddressId,
                allDetails,
                transaction,
              );
          }
        }
      } catch (corsErr) {
        console.error("Cors address update skipped:", corsErr.message);
      }
    }

    await applyStudentMetaDataUpdates(StudentId, info, transaction);

    await transaction.commit();

    const studentRow = await getSingleStudentDetail(StudentId);
    if (!studentRow) {
      throw updateHttpError("Student not found", 404);
    }

    const plainStudent = toPlainRow(studentRow);

    return {
      studentId: StudentId,
      rowsUpdated,
      student: plainStudent,
    };
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating student:", error);
    throw error;
  }
}

export async function deleteStudentDetail(studentId) {
  try {
    // Fetch entrance and address details in parallel
    const [entranceDetails, addressDetails] = await Promise.all([
      studentRepository.findEntranceDetailsByStudentId(studentId),
      studentRepository.findStudentAddressByStudentId(studentId),
    ]);

    // Extract IDs
    const entranceIds = entranceDetails.map(
      (detail) => detail.dataValues.students_entrance_detail_id,
    );
    const addressId = addressDetails?.dataValues?.students_address_id;

    // Perform deletions in parallel
    const [deleteEntranceResult, deleteAddressResult, deleteStudentResult] =
      await Promise.all([
        studentRepository.deleteStudentEntranceDetail(entranceIds),
        studentRepository.deleteStudentAddressDetail(addressId),
        studentRepository.deleteStudentDetail(studentId),
      ]);

    // Check if all deletions successful
    if (deleteEntranceResult && deleteAddressResult && deleteStudentResult) {
      return { message: "Student and related records deleted successfully" };
    } else {
      return { message: "Some records were not found or not deleted" };
    }
  } catch (error) {
    console.error("Error deleting student:", error);
    return {
      message: "An error occurred while trying to delete the student",
      error: error.message,
    };
  }
}

export async function getEmptyEnrollNumber() {
  return await studentRepository.getEmptyEnrollNumber();
}

export async function studentCourseMapping(data) {
  return await studentRepository.studentCourseMapping(data);
}

export async function classStudentMapping(data, createdBy) {
  try {
    const { studentId, classSectionId } = data;
    const results = [];

    for (const id of studentId) {
      const entryData = { studentId: id, classSectionId, createdBy };
      const result = await studentRepository.classStudentMapping(entryData);

      // Record in history
      await historyRepository.createHistory({
        studentId: id,
        classSectionsId: classSectionId,
        status: "current",
        createdBy,
      });

      results.push(result);
    }

    return results;
  } catch (error) {
    console.error("Error in classStudentMapping:", error);
    throw error;
  }
}

export async function getclassStudentMapping(semesterId, acedmicYearId) {
  return await studentRepository.getclassStudentMapping(
    semesterId,
    acedmicYearId,
  );
}

export async function addElectiveSubject(data, createdBy) {
  data.createdBy = createdBy;
  return await studentRepository.addElectiveSubject(data);
}

export async function promoteStudent(data) {
  if (!data) {
    return {
      message:
        "next acedmic year is active for promate the student and semester is required",
    };
  }

  const studentDetail = await studentRepository.getStudentForPromate(
    data.studentId,
  );

  const courseId = studentDetail.dataValues.courseId;

  const currentAcademicYearId = studentDetail.dataValues.acedmicYearId;

  const allSemestersRaw =
    await studentRepository.getSemesterByCourseId(courseId);

  const allAcedmicYears =
    await acedmicYearCreationService.getacedmicYearDetails();

  //  Ensure semesters are in array format
  const allSemesters = Array.isArray(allSemestersRaw)
    ? allSemestersRaw
    : [allSemestersRaw];

  //  Sort semesters by ID (or name if needed)
  const sortedSemesters = allSemesters.sort(
    (a, b) => a.semesterId - b.semesterId,
  );

  //  Find current semester index
  const currentSemesterIndex = sortedSemesters.findIndex(
    (sem) => sem.semesterId === data.semesterId,
  );

  if (currentSemesterIndex === -1) {
    return { message: "Invalid semester ID for student" };
  }

  //  Get current semester object
  const currentSemester = sortedSemesters[currentSemesterIndex];

  const nextSemester = sortedSemesters[currentSemesterIndex + 1];

  let nextAcedmicYearId = currentAcademicYearId;

  //  Determine how many semesters per academic year
  const semPerYear = 12 / currentSemester.semesterDuration;

  //  Check if promotion crosses to next academic year
  if ((currentSemesterIndex + 1) % semPerYear === 0) {
    // Move to next academic year
    const currentAcedmicYearObj = allAcedmicYears.find(
      (a) => a.dataValues.acedmicYearId === currentAcademicYearId,
    );
    const currentIndex = allAcedmicYears.indexOf(currentAcedmicYearObj);

    if (currentIndex !== -1 && currentIndex + 1 < allAcedmicYears.length) {
      nextAcedmicYearId =
        allAcedmicYears[currentIndex + 1].dataValues.acedmicYearId;
    } else {
      console.log(`No next academic year found`);
    }
  }

  if (!nextSemester) {
    return { message: "Student has completed all semesters" };
  }

  //  Update student mapping in DB
  const result = await studentRepository.promoteStudent(data.studentId, {
    semesterId: nextSemester.semesterId,
    acedmicYearId: nextAcedmicYearId,
    classSectionsId: data.classSectionsId, // if needed
  });

  // Record history (New entries only)
  const oldClassSectionId = studentDetail.dataValues.classSectionsId;
  const createdBy = data.createdBy || null;

  // 1. Create entry for old section as 'passed'
  if (oldClassSectionId) {
    await historyRepository.createHistory({
      studentId: data.studentId,
      classSectionsId: oldClassSectionId,
      status: "passed",
      createdBy,
    });
  }

  // 2. Create entry for new section as 'current'
  if (data.classSectionsId) {
    await historyRepository.createHistory({
      studentId: data.studentId,
      classSectionsId: data.classSectionsId,
      status: "current",
      createdBy,
    });
  }

  return { message: "Student promoted", result };
}

function incrementScholarNumber(scholarNumber) {
  const parts = scholarNumber.split("/");
  const lastPart = parts[parts.length - 1];

  const incremented = String(parseInt(lastPart, 10) + 1).padStart(
    lastPart.length,
    "0",
  );

  parts[parts.length - 1] = incremented;
  return parts.join("/");
}

function toPlainRow(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function formatStudentDisplayName(student) {
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function resolveTermDisplayStatus(feePlanItem, invoice, today = todayDateOnly()) {
  if (invoice) {
    if (invoice.paymentStatus === "paid") return "paid";
    if (invoice.paymentStatus === "partial") return "partial";
    return "unpaid";
  }

  const startDate = String(feePlanItem.createDate).slice(0, 10);
  return startDate > today ? "upcoming" : "pending";
}

function formatStudentTermRow(feePlanItem, invoice, index) {
  const item = toPlainRow(feePlanItem);
  const inv = invoice ? toPlainRow(invoice) : null;
  const subItems = item.feePlanSubItems ?? [];
  const { amount, supplementalFees, total } = splitFeePlanSubItemAmounts(subItems);
  const hasFeeLines = subItems.length > 0;

  return {
    sno: index + 1,
    feePlanItemId: item.feePlanItemId,
    startDate: item.createDate ?? null,
    endDate: item.dueDate ?? null,
    amount,
    supplementalFees,
    total,
    feeTypeCatalogs: mapFeePlanSubItemsForResponse(subItems),
    status: resolveTermDisplayStatus(item, inv),
    studentFeeInvoiceId: inv?.studentFeeInvoiceId ?? null,
    paymentStatus: inv?.paymentStatus ?? null,
    canGenerateInvoice: !inv && hasFeeLines,
  };
}

function formatFeePlanInitiateStudentRow(student, feePlanItems, invoiceMap) {
  const s = toPlainRow(student);
  const profile = s.studentFeePlanProfile ?? {};
  const course = s.course ?? {};
  const session = s.studentSession ?? {};
  const section = s.studentSections ?? {};

  const studentInvoices = invoiceMap.get(s.studentId) ?? new Map();

  return {
    studentId: s.studentId,
    date: s.enrollDate ?? s.admisssionDate ?? null,
    studentName: formatStudentDisplayName(s),
    scholarNumber: s.scholarNumber,
    className:
      [section.class, section.section].filter(Boolean).join("") ||
      section.section ||
      section.class ||
      null,
    program: course.courseName ?? null,
    session: session.sessionName ?? null,
    feePlanName: profile.name ?? null,
    feePlanProfileId: s.feePlanProfileId,
    terms: feePlanItems.map((item, index) =>
      formatStudentTermRow(item, studentInvoices.get(toPlainRow(item).feePlanItemId), index)
    ),
  };
}

function buildInvoiceMap(invoices) {
  const invoiceMap = new Map();
  for (const inv of invoices) {
    const p = toPlainRow(inv);
    if (!invoiceMap.has(p.studentId)) {
      invoiceMap.set(p.studentId, new Map());
    }
    invoiceMap.get(p.studentId).set(p.feePlanItemId, inv);
  }
  return invoiceMap;
}

function groupFeePlanItemsByProfileId(feePlanItems) {
  const byProfile = new Map();
  for (const item of feePlanItems) {
    const p = toPlainRow(item);
    const profileId = p.feePlanProfileId;
    if (!byProfile.has(profileId)) byProfile.set(profileId, []);
    byProfile.get(profileId).push(item);
  }
  return byProfile;
}

/** GET /student/feePlanProfiles/all — students with fee plan + nested terms (paginated). */
export async function getFeePlanInitiateAll(pagination = {}) {
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 20;

  const total = await studentRepository.countStudentsWithFeePlanForInitiate();
  const students = await studentRepository.findStudentsWithFeePlanForInitiate({
    page,
    limit,
  });

  if (!students.length) {
    return {
      students: [],
      pagination: { page, limit, total },
    };
  }

  const studentIds = students.map((s) => toPlainRow(s).studentId);
  const profileIds = [
    ...new Set(
      students
        .map((s) => toPlainRow(s).feePlanProfileId)
        .filter((id) => id != null)
    ),
  ];

  const [feePlanItems, invoices] = await Promise.all([
    studentRepository.findFeePlanItemsByProfileIds(profileIds),
    studentRepository.findInvoicesByStudentIds(studentIds),
  ]);

  const itemsByProfile = groupFeePlanItemsByProfileId(feePlanItems);
  const invoiceMap = buildInvoiceMap(invoices);

  return {
    students: students.map((student) => {
      const profileId = toPlainRow(student).feePlanProfileId;
      const items = itemsByProfile.get(profileId) ?? [];
      return formatFeePlanInitiateStudentRow(student, items, invoiceMap);
    }),
    pagination: { page, limit, total },
  };
}

export async function getEmptyFeeDetails(filters) {
  return await studentRepository.getEmptyFeeDetails(filters);
}

export async function getStudentSubject(studentId) {
  return await studentRepository.getStudentSubject(studentId);
}

// latest

// export async function getFeeDetailsByStudentId(studentId) {
//     try {
//         const invoices = await feeInvoiceRepository.getFeeDetailsByStudentId(studentId);

//         // --- Filter only invoiceStatus = true ---
//         const filtered = invoices.filter(inv => inv.invoiceStatus === true);

//         if (filtered.length === 0) {
//             return {
//                 studentInfo: {},
//                 personalInfo: {},
//                 parentInfo: {},
//                 invoices: [],
//                 summary: {}
//             };
//         }

//         // -------- STUDENT INFO ---------
//         const student = filtered[0].studentinvoice || {};

//         const studentInfo = {
//             studentName: `${student.firstName || ""} ${student.middleName || ""} ${student.lastName || ""}`.trim(),
//             course: student.course?.courseName || "",
//             scholarNumber: student.scholarNumber || "",
//             classSection: student.studentSemester?.classSections?.[0]?.section || "",
//             semester: student.studentSemester?.name || "",
//             academicYear: student.acdemicYear?.yearTitle || ""
//         };

//         const personalInfo = {
//             contactNo: student.phoneNumber || "",
//             email: student.email || ""
//         };

//         const parentInfo = {
//             fatherName: student.fatherName || "",
//             contactNo: student.parentNumber || "",
//             email: student.parentEmail || "",
//             address: student.pAddress || ""
//         };

//         // -------- INVOICE LOOP ---------
//         const formattedInvoices = filtered.map(inv => {
//             // Flags
//             const hasPlan = inv.feeInvoicedata && typeof inv.feeInvoicedata === "object";
//             const hasFeeType = !hasPlan && inv.studentinvoiceFeeType;

//             let invoiceNo = inv.invoiceNumber || "";
//             let dueDate = inv.dueDate || "";
//             let title = "";
//             let total = 0;
//             let feeItems = [];

//             // -------- CASE 1: PLAN INVOICE ---------
//             if (hasPlan) {
//                 const fee = inv.feeInvoicedata;

//                 const semesters = Array.isArray(fee.semesters) ? fee.semesters : [];
//                 const additionalFees = Array.isArray(fee.additionalFees) ? fee.additionalFees : [];

//                 semesters.forEach(s => {
//                     feeItems.push({
//                         name: s.name || "",
//                         dueDate: fee.EndDate || dueDate,
//                         amount: s.fee || 0,
//                         subTotal: s.fee || 0
//                     });
//                 });

//                 additionalFees.forEach(a => {
//                     feeItems.push({
//                         name: a.name || "",
//                         dueDate: fee.EndDate || dueDate,
//                         amount: a.fee || 0,
//                         subTotal: a.fee || 0
//                     });
//                 });

//                 total = fee.total || feeItems.reduce((sum, i) => sum + Number(i.amount), 0);
//                 invoiceNo = fee.InvoiceNumber || invoiceNo;
//                 title = semesters[0]?.name || fee.name || "";
//                 dueDate = fee.EndDate || dueDate;
//             }

//             // -------- CASE 2: FEE TYPE INVOICE ---------
//             else if (hasFeeType) {
//                 const ft = inv.studentinvoiceFeeType;

//                 const amount = Number(ft.feeValue || 0);

//                 feeItems.push({
//                     name: ft.name || "",
//                     dueDate: dueDate,
//                     amount,
//                     subTotal: amount
//                 });

//                 total = amount;
//                 title = ft.name || "";
//             }

//             // -------- PAYMENTS FOR THIS INVOICE ---------
//             const payments = Array.isArray(inv.studentMakePayment) ? inv.studentMakePayment : [];

//             const isApplied = payments.some(p => p.isApplyed === true);

//             return {
//                 studentInvoiceMapperId: inv.studentInvoiceMapperId,
//                 invoiceNo,
//                 title,
//                 dueDate,
//                 isApplied : false,
//                 total,
//                 subTotal: total,
//                 feeItems,
//                 payments
//             };
//         });

//         // -------- SUMMARY ---------
//         let appliedPayments = 0;
//         let unappliedPayments = 0;

//         filtered.forEach(inv => {
//             const payments = inv.studentMakePayment || [];
//             payments.forEach(p => {
//                 const amt = Number(p.paidAmount || 0);
//                 if (p.isApplyed) appliedPayments += amt;
//                 else unappliedPayments += amt;
//             });
//         });

//         const totalDue = formattedInvoices.reduce((sum, f) => sum + (f.total || 0), 0);

//         const remainingAmount = totalDue - appliedPayments;

//         const summary = {
//             appliedPayments:'',
//             unappliedPayments:'',
//             remainingAmount:'',
//             totalDue:''
//         };

//         return {
//             studentInfo,
//             personalInfo,
//             parentInfo,
//             invoices: formattedInvoices,
//             summary
//         };

//     } catch (error) {
//         console.error("Error formatting Fee Invoice Details:", error);
//         throw error;
//     }
// };

export async function getFeeDetailsByStudentId(studentId) {
  try {
    const invoices =
      await feeInvoiceRepository.getFeeDetailsByStudentId(studentId);

    // --- Filter only invoiceStatus = true ---
    const filtered = invoices.filter((inv) => inv.invoiceStatus === true);

    if (filtered.length === 0) {
      return {
        studentInfo: {},
        personalInfo: {},
        parentInfo: {},
        invoices: [],
        summary: {},
      };
    }

    //  NEW: Convert new DB structure into old key for backward compatibility
    filtered.forEach((inv) => {
      inv.studentinvoiceFeeType = inv.feeTypeGroup?.feeTypes || null;
    });

    // -------- STUDENT INFO ---------
    const student = filtered[0].studentinvoice || {};

    const studentInfo = {
      studentName:
        `${student.firstName || ""} ${student.middleName || ""} ${student.lastName || ""}`.trim(),
      course: student.course?.courseName || "",
      scholarNumber: student.scholarNumber || "",
      classSection: student.studentSemester?.classSections?.[0]?.section || "",
      semester: student.studentSemester?.name || "",
      academicYear: student.acdemicYear?.yearTitle || "",
    };

    const personalInfo = {
      contactNo: student.phoneNumber || "",
      email: student.email || "",
    };

    const parentInfo = {
      fatherName: student.fatherName || "",
      contactNo: student.parentNumber || "",
      email: student.parentEmail || "",
      address: student.pAddress || "",
    };

    // -------- INVOICE LOOP ---------
    const formattedInvoices = filtered.map((inv) => {
      const hasPlan =
        inv.feeInvoicedata && typeof inv.feeInvoicedata === "object";
      const hasFeeType = !hasPlan && inv.studentinvoiceFeeType;
      const hasFeeTypeGroup =
        !hasPlan &&
        !hasFeeType &&
        Array.isArray(inv.feeTypeGroup) &&
        inv.feeTypeGroup.length > 0;

      let invoiceNo = inv.invoiceNumber || "";
      let dueDate = inv.dueDate || "";
      let title = "";
      let total = 0;
      let feeItems = [];

      // -------- CASE 1: PLAN INVOICE ---------
      if (hasPlan) {
        const fee = inv.feeInvoicedata;

        const semesters = Array.isArray(fee.semesters) ? fee.semesters : [];
        const additionalFees = Array.isArray(fee.additionalFees)
          ? fee.additionalFees
          : [];

        semesters.forEach((s) => {
          feeItems.push({
            name: s.name || "",
            dueDate: fee.EndDate || dueDate,
            amount: s.fee || 0,
            subTotal: s.fee || 0,
          });
        });

        additionalFees.forEach((a) => {
          feeItems.push({
            name: a.name || "",
            dueDate: fee.EndDate || dueDate,
            amount: a.fee || 0,
            subTotal: a.fee || 0,
          });
        });

        total =
          fee.total || feeItems.reduce((sum, i) => sum + Number(i.amount), 0);
        invoiceNo = fee.InvoiceNumber || invoiceNo;
        title = semesters[0]?.name || fee.name || "";
        dueDate = fee.EndDate || dueDate;
      }

      // -------- CASE 2: OLD FEE TYPE INVOICE ---------
      else if (hasFeeType) {
        const ft = inv.studentinvoiceFeeType;

        const amount = Number(ft.feeValue || 0);

        feeItems.push({
          name: ft.name || "",
          dueDate,
          amount,
          subTotal: amount,
        });

        total = amount;
        title = ft.name;
      }

      // -------- ⭐ CASE 3: NEW FEE TYPE GROUP INVOICE ---------
      else if (hasFeeTypeGroup) {
        inv.feeTypeGroup.forEach((ftg) => {
          const ft = ftg.feeTypes;

          feeItems.push({
            name: ft?.name || "",
            dueDate,
            amount: Number(ftg.subtotal || ftg.amount || 0),
            subTotal: Number(ftg.subtotal || ftg.amount || 0),
          });

          total += Number(ftg.subtotal || ftg.amount || 0);
        });

        title = feeItems[0]?.name || "";
      }

      // -------- PAYMENTS ---------
      const payments = Array.isArray(inv.studentMakePayment)
        ? inv.studentMakePayment
        : [];
      const isApplied = payments.some((p) => p.isApplyed === true);

      return {
        studentInvoiceMapperId: inv.studentInvoiceMapperId,
        invoiceNo,
        title,
        dueDate,
        isApplied: false,
        total,
        subTotal: total,
        feeItems,
        payments,
      };
    });

    // -------- SUMMARY ---------
    let appliedPayments = 0;
    let unappliedPayments = 0;

    filtered.forEach((inv) => {
      const payments = inv.studentMakePayment || [];
      payments.forEach((p) => {
        const amt = Number(p.paidAmount || 0);
        if (p.isApplyed) appliedPayments += amt;
        else unappliedPayments += amt;
      });
    });

    const totalDue = formattedInvoices.reduce(
      (sum, f) => sum + (f.total || 0),
      0,
    );
    const remainingAmount = totalDue - appliedPayments;

    const summary = {
      appliedPayments: "",
      unappliedPayments: "",
      remainingAmount: remainingAmount,
      totalDue: totalDue,
    };

    return {
      studentInfo,
      personalInfo,
      parentInfo,
      invoices: formattedInvoices,
      summary,
    };
  } catch (error) {
    console.error("Error formatting Fee Invoice Details:", error);
    throw error;
  }
}

export async function getBooksIssuedToStudent(studentId) {
  const rawData = await libraryRepository.getBooksIssuedToStudent(studentId);

  if (!rawData || rawData.length === 0) {
    return { message: "No issued books found", books: [] };
  }

  const studentDetails = rawData[0].studentDetailsBook;

  const groupedBooks = {};

  rawData.forEach((item) => {
    const bookId = item.bookDetails.libraryBookId;

    if (!groupedBooks[bookId]) {
      groupedBooks[bookId] = {
        bookDetails: item.bookDetails,
        inventory: [],
      };
    }

    groupedBooks[bookId].inventory.push({
      inventoryId: item.inventoryId,
      barcode: item.barcode,
      issueDate: item.issueDate,
      dueDate: item.dueDate,
      status: item.status,
      createdAt: item.createdAt,
    });
  });

  const booksArray = Object.values(groupedBooks);

  return {
    studentDetails,
    books: booksArray,
  };
}

export async function getStudentTimeTable(studentId) {
  //  Fetch student details
  const student =
    await studentRepository.getStudentDetailsRepository(studentId);

  if (!student) return { formatted: [] };

  const classSectionsId = student.dataValues.class_sections_id;
  const semesterId = student.dataValues.semester_id;
  const courseId = student.dataValues.course_id;

  //  Fetch subjects for student's semester
  const subjectMaps = student.studentSemester?.semestermapping || [];
  const subjectIds = subjectMaps.map((item) => item.subjects.subjectId);

  if (subjectIds.length === 0) return { formatted: [] };

  //  Fetch timetable data
  const timetable =
    await timeTableCreateRepository.getStudentTimeTableRepository(
      classSectionsId,
      subjectIds,
    );

  //  Format output
  return formatStudentTimetable(timetable);
}

function formatStudentTimetable(allData) {
  const allMappings = [];

  for (const item of allData) {
    const course = item.timeTableCourse || {};
    const classSection = item.timeTableClassSection || {};

    (item.timeTablecreate || []).forEach((period) => {
      const {
        day,
        timeTableMappingId,
        isSameTeacher,
        timeTableCreationId,
        timeTablecreation,
        timeTableSubject,
        employeeDetails,
        timeTableTeacherSubject,
      } = period;

      const subjectData = isSameTeacher
        ? timeTableTeacherSubject?.employeeSubject?.subjects
        : timeTableSubject;

      const teacherData = isSameTeacher
        ? timeTableTeacherSubject?.teacherEmployeeData
        : employeeDetails;

      const mappingEntry = {
        timeTableMappingId,
        employeeId: teacherData?.employeeId,
        employeeName: teacherData?.employeeName,
        employeeCode: teacherData?.employeeCode,
        pickColor: teacherData?.pickColor,
        subject: {
          subjectId: subjectData?.subjectId,
          Name: subjectData?.subjectName,
          Code: subjectData?.subjectCode,
        },
      };

      allMappings.push({
        day,
        timeTableCreationId,
        periodDetails: timeTablecreation,
        mappingEntry,
        baseMetadata: {
          courseName: course.courseName,
          courseCode: course.courseCode,
          courseId: item.courseId,
          class: classSection.class,
          section: classSection.section,
          classSectionsId: item.classSectionsId,
        },
      });
    });
  }

  const formatted = [];

  allMappings.forEach((curr) => {
    let rec = formatted.find((r) => r.courseId === curr.baseMetadata.courseId);

    if (!rec) {
      rec = {
        courseName: curr.baseMetadata.courseName,
        courseCode: curr.baseMetadata.courseCode,
        courseId: curr.baseMetadata.courseId,
        class: curr.baseMetadata.class,
        section: curr.baseMetadata.section,
        classSectionsId: curr.baseMetadata.classSectionsId,
        sectionRoutine: [],
      };
      formatted.push(rec);
    }

    let dayObj = rec.sectionRoutine.find((d) => d.day === curr.day);
    if (!dayObj) {
      dayObj = { day: curr.day, period: [] };
      rec.sectionRoutine.push(dayObj);
    }

    let periodObj = dayObj.period.find(
      (p) => p.timeTableCreationId === curr.timeTableCreationId,
    );
    if (!periodObj) {
      dayObj.period.push({
        timeTableCreationId: curr.timeTableCreationId,
        periodName: curr.periodDetails.periodName,
        isBreak: curr.periodDetails.isBreak,
        startTime: curr.periodDetails.startTime,
        endTime: curr.periodDetails.endTime,
        mappingData: [curr.mappingEntry],
      });
    } else {
      periodObj.mappingData.push(curr.mappingEntry);
    }
  });

  return { formatted };
}

export async function getStudentsByClassSection(
  timeTableMappingId,
  academicYearId,
  date,
) {
  try {
    const classScheduleItem = await model.classScheduleModel.findByPk(
      timeTableMappingId,
      {
        attributes: ["timeTableMappingId", "day", "timeTableType"],
        include: [
          {
            model: model.timeTableRoutineModel,
            as: "timeTablecreate",
            attributes: ["classSectionsId"],
            include: [
              {
                model: model.classSectionModel,
                as: "timeTableClassSection",
                attributes: ["classSectionsId", "section"],
              },
            ],
          },
          {
            model: model.subjectModel,
            as: "timeTableSubject",
            attributes: ["subjectId", "subjectName"],
            include: [
              {
                model: model.courseModel,
                as: "courseInfo",
                attributes: ["courseId", "courseName", "courseCode"],
              },
            ],
          },
        ],
        raw: true,
        nest: true,
      },
    );

    const students = await studentRepository.getStudentsByClassSection(
      classScheduleItem?.timeTablecreate?.classSectionsId,
      timeTableMappingId,
      academicYearId,
      date,
    );

    if (!students.length) return {};

    // const attendanceData = students.map((student) => {

    //   const attendance = student.studentAttendance?.[0];  // ⭐ alias fix

    //   return {
    //     studentId: student.studentId,
    //     "scholarNo": student.scholarNumber,
    //     "enrollNo": student.enrollNumber,
    //     "studentName": `${student.firstName} ${student.lastName}`,
    //     attendanceStatus: attendance?.attendanceStatus || null,
    //     notes: attendance?.notes || null,
    //     description: attendance?.description || null
    //   };

    // });

    // const firstStudent = students[0];
    // const firstAttendance = firstStudent.studentAttendance?.[0];

    // const subjectName = firstAttendance?.timeTableMapping?.timeTableSubject?.subjectName || null;

    // return {

    //   classSectionsId: firstStudent.classSectionsId,
    //   subjectName: subjectName,
    //   courseName: firstStudent.course?.courseName || null,
    //   section: firstStudent.classSection?.section || null,
    //   timeTableMappingId: firstAttendance?.timeTableMappingId || timeTableMappingId,
    //   date: firstAttendance?.date || date,

    //   attendance: attendanceData

    // };

    return { students, classScheduleItem };
  } catch (error) {
    console.error("Service Error:", error);
    throw error;
  }
}

export async function getAllAnswerSheets(filters) {
  const { examScheduleId } = filters;

  const schedule = await studentRepository.getScopedExamScheduleForEvaluation(
    examScheduleId,
  );

  if (!schedule) {
    const error = new Error(
      "Exam schedule not found for the selected institute/university",
    );
    error.statusCode = 404;
    throw error;
  }

  const examSetupTypeTerm = schedule.examSetupTypeTerm;
  const sessionId = schedule.sessionId;

  const courseId = examSetupTypeTerm?.courseId;
  const term = examSetupTypeTerm?.term;

  const studentsdata = await studentRepository.getStudentsWithAnswerSheetStatus(
    sessionId,
    courseId,
    term,
    examScheduleId,
  );

  const data = studentsdata.map((student) => {
    const fullName = [student.firstName, student.middleName, student.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      enrollNumber: student.enrollNumber || null,
      scholarNumber: student.scholarNumber || null,
      fullName: fullName || null,
      // Left join can return empty array when QR is not mapped.
      isMapped: Boolean(student.answerSheetQrs && student.answerSheetQrs[0]),
      answerSheetQrId: student.answerSheetQrs?.[0]?.id ?? null,
    };
  });

  return data;
}
