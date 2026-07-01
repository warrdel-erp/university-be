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
  getCourseByCourseId,
} from "../repository/courseRepository.js";
import { findClassSectionTermById } from "../repository/classSectionTermRepository.js";
import { buildTermName } from "../utility/courseTerms.js";
import { studentRegister } from "../services/userServices.js";
import * as acedmicYearCreationService from "../repository/acedmicYearRepository.js";
import * as sessionRepository from "../repository/sessionRepository.js";
import * as feePlanProfileRepository from "../repository/feePlanProfileRepository.js";
import * as roleRepository from "../repository/roleRepository.js";
import { parseCustomDate } from "../utility/dateFormat.js";
import * as feeInvoiceRepository from "../repository/feeInvoiceRepository.js";
import * as libraryRepository from "../repository/libraryCreationRepository.js";
import * as timeTableCreateRepository from "../repository/timeTablecreateRepository.js";
import * as model from "../models/index.js";
import { decimalAdd, decimalSum, toMoneyNumber } from "../utility/decimalMoney.js";
import { FEE_PLAN_PUBLISH_STATUS } from "../constant.js";
import { getTenantStore } from "../utility/requestContext.js";
import {
  classSectionTermsInclude,
  resolveProgramTerm,
  resolveProgramYear,
  resolveClassSectionTermId,
  resolveStudentSection,
  resolveStudentClassSectionsId,
  timeTableRoutineClassSectionInclude,
  resolveTimeTableRoutineSection,
} from "../utility/classSectionIncludes.js";

function normalizeAffiliatedUniversityId(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function buildStudentRowPayload(info) {
  const {
    entranceDetails,
    addressDetails,
    corsAddress,
    allDropDownData,
    roleId,
    admissionDate,
    additionalNotes,
    gender,
    caste,
    religion,
    bloodGroup,
    academicYearId,
    term,
    classSectionsId,
    classSectionId,
    ...studentRow
  } = info;
  return studentRow;
}

async function resolveAcademicYearIdForClassMapping({ academicYearId, sessionId }) {
  if (academicYearId != null) return academicYearId;
  if (!sessionId) return null;
  const session = await model.sessionModel.findByPk(sessionId, {
    attributes: ["academicYearId"],
  });
  return session?.academicYearId ?? null;
}

function toEntranceDetailRow(detail = {}) {
  return {
    ...detail,
    categoryRank:
      detail.categoryRank != null && detail.categoryRank !== ""
        ? Number(detail.categoryRank)
        : detail.categoryRank,
    marks:
      detail.marks != null && detail.marks !== ""
        ? Number(detail.marks)
        : detail.marks,
    percentile:
      detail.percentile != null && detail.percentile !== ""
        ? Number(detail.percentile)
        : detail.percentile,
  };
}

async function resolveClassSectionPlacementFromTermId(classSectionTermId, options = {}) {
  const termRow = await findClassSectionTermById(Number(classSectionTermId), options);
  if (!termRow) return null;

  const plain = termRow.get ? termRow.get({ plain: true }) : termRow;
  const classSectionsId =
    plain.classSectionsId ?? plain.classSection?.classSectionsId ?? null;
  if (!classSectionsId) return null;

  return {
    classSectionTermId: Number(classSectionTermId),
    classSectionsId: Number(classSectionsId),
    term: plain.term ?? null,
    classSection: plain.classSection ?? null,
  };
}

async function resolveClassSectionTermIdForStudent(info, options = {}) {
  if (info.classSectionTermId == null || info.classSectionTermId === '') {
    return null;
  }

  const placement = await resolveClassSectionPlacementFromTermId(
    info.classSectionTermId,
    options,
  );
  if (!placement) {
    throw new Error('classSectionTermId not found');
  }
  return placement.classSectionTermId;
}

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
  academicYearId,
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
    if (!info.scholarNumber) {
      info.scholarNumber = await generateScholarNumber(
        info.courseId,
        info.instituteId,
        sessionId ?? info.sessionId,
      );
    }
    info.email = info.email.toLowerCase();
    info.createdBy = createdBy;
    info.academicYearId = academicYearId ?? info.academicYearId;

    const classSectionTermId = Number(info.classSectionTermId);
    if (!classSectionTermId) {
      throw new Error('classSectionTermId is required');
    }
    const termRow = await findClassSectionTermById(classSectionTermId, { transaction });
    if (!termRow) {
      throw new Error('classSectionTermId not found');
    }
    info.classSectionTermId = classSectionTermId;

    const termPlain = termRow.get ? termRow.get({ plain: true }) : termRow;
    const historyClassSectionsId =
      termPlain.classSectionsId ?? termPlain.classSection?.classSectionsId ?? null;

    info.affiliatedUniversityId = normalizeAffiliatedUniversityId(info.affiliatedUniversityId);

    const studentPayload = buildStudentRowPayload(info);

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

    const mapperPayload = await studentRepository.buildClassStudentMapperCreatePayload(
      {
        studentId,
        createdBy,
        classSectionTermId: studentPayload.classSectionTermId,
      },
      transaction,
    );
    const result = await studentRepository.sectionStudentMapping(
      mapperPayload,
      transaction,
    );

    // Record in history
    if (historyClassSectionsId) {
      await historyRepository.createHistory(
        {
          studentId,
          classSectionsId: historyClassSectionsId,
          classSectionTermId: studentPayload.classSectionTermId,
          status: "current",
          createdBy,
        },
        transaction,
      );
    }
    //  entranceDetails — shape validated in route Zod schema
    let entranceDetails = [];
    if (Array.isArray(info.entranceDetails) && info.entranceDetails.length > 0) {
      entranceDetails = info.entranceDetails.map((detail) => ({
        ...toEntranceDetailRow(detail),
        studentId,
        createdBy,
      }));
      await studentRepository.addStudentsEntranceDetail(
        entranceDetails,
        transaction,
      );
    }

    //  addressDetails
    let addressDetails = null;
    if (
      info.addressDetails &&
      typeof info.addressDetails === "object" &&
      !Array.isArray(info.addressDetails)
    ) {
      addressDetails = await studentRepository.addStudentsAddress(
        { ...info.addressDetails, studentId, createdBy },
        transaction,
      );
    }

    // cors AddressDetails
    let CorsAddressDetails = null;
    if (
      info.corsAddress &&
      typeof info.corsAddress === "object" &&
      !Array.isArray(info.corsAddress)
    ) {
      CorsAddressDetails = await studentRepository.addStudentsCorsAddress(
        { ...info.corsAddress, studentId, createdBy },
        transaction,
      );
    }

    //  allDropDownData — type/code length validated in route Zod schema
    let allDropDownData = null;
    if (info.allDropDownData?.type?.length) {
      const { type, code } = info.allDropDownData;
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
      classSectionTermId: plainStudent.classSectionTermId,
      courseId: plainStudent.courseId,
      sessionId: plainStudent.sessionId,
      academicYearId: mapperAcademicYearId,
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



async function assertFeePlanProfileForInstitute(feePlanProfileId) {
  const profile = await feePlanProfileRepository.findFeePlanProfileByIdForInstitute(
    feePlanProfileId
  );
  if (!profile) {
    throw new Error("Fee plan profile not found for this institute");
  }
  const plain =
    typeof profile.get === "function" ? profile.get({ plain: true }) : profile;
  if (plain.publishStatus !== FEE_PLAN_PUBLISH_STATUS.PUBLISHED) {
    throw new Error("Only published fee plans can be assigned to students");
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
  if (!email) return;
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

  const { universityId, sessionId } = info;

  const roleId = await resolveStudentRoleId();

  return addStudent(
    info,
    files,
    createdBy,
    universityId,
    roleId,
    info.academicYearId,
    sessionId,
  );
}

async function generateScholarNumber(courseId, instituteId, sessionId) {
  const getCourseCodeDetail = await getCourseCode(courseId);
  const getInstitueCodeDetail = await getInstituteCode(instituteId);
  const courseCode = getCourseCodeDetail?.get("courseCode");
  const institueCode = getInstitueCodeDetail?.get("instituteCode");

  if (!courseCode || !institueCode) {
    throw new Error(
      `Cannot generate scholar number: missing course or institute code (courseId=${courseId}, instituteId=${instituteId})`,
    );
  }

  const getPreviousScholarNumber =
    await studentRepository.getPreviousScholarNumber(institueCode);
  const previousScholarNumber = getPreviousScholarNumber
    ? getPreviousScholarNumber.get("scholarNumber")
    : null;
  let scholarNumber;
  if (previousScholarNumber) {
    const scholarNumberParts = previousScholarNumber.split("/");
    const scholarNumberPrefix = scholarNumberParts.slice(0, 3).join("/");
    const scholarNumberSuffix = parseInt(scholarNumberParts[3], 10) + 1;
    scholarNumber = `${scholarNumberPrefix}/${scholarNumberSuffix.toString().padStart(6, "0")}`;
  } else {
    const sessionYear = await sessionRepository.getSessionYearSuffix(sessionId);
    const yearLastTwoDigits = sessionYear ?? moment().format("YY");
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
  const row = await studentRepository.getSingleStudentDetail(studentId);
  return toPlainRow(row);
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
//         academicYearId: result.dataValues.academicYearId,
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
//       await studentRepository.sectionStudentMappingExcel(studentMapping, transaction);
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
        convertedData.sessionId,
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

      const mapperAcademicYearId = await resolveAcademicYearIdForClassMapping({
        academicYearId: convertedData.academicYearId,
        sessionId: convertedData.sessionId,
      });
      delete convertedData.academicYearId;

      //  Step 7: Insert student with scholar number
      const classSectionTermId = Number(convertedData.classSectionTermId);
      if (!classSectionTermId) {
        throw new Error('classSectionTermId is required for import');
      }
      const placement = await resolveClassSectionPlacementFromTermId(
        classSectionTermId,
        { transaction },
      );
      if (!placement) {
        throw new Error('classSectionTermId not found');
      }
      convertedData.classSectionTermId = placement.classSectionTermId;

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
        academicYearId: mapperAcademicYearId,
        classSectionTermId: result.dataValues.classSectionTermId,
        classSectionsId: placement.classSectionsId,
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
      await studentRepository.sectionStudentMappingExcel(
        studentMapping,
        transaction,
      );

      // Bulk record in history
      const historyEntries = studentMapping.map((mapping) => ({
        studentId: mapping.studentId,
        classSectionsId: mapping.classSectionsId,
        classSectionTermId: mapping.classSectionTermId,
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
//         academicYearId: result.dataValues.academicYearId,
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
//       await studentRepository.sectionStudentMappingExcel(studentMapping, transaction);
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
        bulk.sessionId,
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

/** Scalar columns allowed on PATCH — fee v2 does not use classSectionTermId / feePlanId on update unless explicitly sent. */
const STUDENT_SCALAR_UPDATE_FIELDS = new Set([
  "universityId",
  "campusId",
  "instituteId",
  "affiliatedUniversityId",
  "courseLevelId",
  "courseId",
  "specializationId",
  "sessionId",
  "classSectionTermId",
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
    if (key === 'affiliatedUniversityId') {
      payload.affiliatedUniversityId = normalizeAffiliatedUniversityId(value);
      continue;
    }
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



export async function updateStudentDetails(
  StudentId,
  info,
  files,
  createdBy,
) {
  const instituteId = getTenantStore().instituteId;
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

    if ("classSectionTermId" in info) {
      if (info.classSectionTermId == null || info.classSectionTermId === '') {
        delete info.classSectionTermId;
      } else {
        const resolvedClassSectionTermId = await resolveClassSectionTermIdForStudent(
          info,
          { transaction },
        );
        info.classSectionTermId = resolvedClassSectionTermId;
      }
    }

    const studentPayload = pickStudentUpdatePayload(info);

    if (studentPayload.feePlanProfileId) {
      const resolvedInstituteId = instituteId ?? studentPayload.instituteId ?? info.instituteId;
      if (!resolvedInstituteId) {
        throw new Error("instituteId is required to assign a fee plan");
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
          const { studentsEntranceDetailId, ...allDetails } =
            toEntranceDetailRow(detail);
          if (studentsEntranceDetailId) {
            entranceDetails =
              await studentRepository.updateStudentEntranceDetails(
                studentsEntranceDetailId,
                allDetails,
                transaction,
              );
          } else if (createdBy) {
            const created = await studentRepository.addStudentsEntranceDetail(
              [{ ...allDetails, studentId: StudentId, createdBy }],
              transaction,
            );
            entranceDetails = created;
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
      throw new Error("Student not found");
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

export async function getEmptyEnrollNumber(academicYearId) {
  return await studentRepository.getEmptyEnrollNumber(academicYearId);
}

export async function studentCourseMapping(data) {
  return await studentRepository.studentCourseMapping(data);
}

export async function sectionStudentMapping(data, createdBy) {
  try {
    const classSectionTermId = Number(data.classSectionTermId);
    if (!classSectionTermId) {
      const error = new Error("classSectionTermId is required");
      error.statusCode = 400;
      throw error;
    }

    const { studentId } = data;
    const studentIds = Array.isArray(studentId) ? studentId : [studentId];
    const results = [];

    for (const id of studentIds) {
      const entryData = await studentRepository.buildClassStudentMapperCreatePayload(
        {
          studentId: id,
          classSectionTermId,
          createdBy,
        },
      );
      const result = await studentRepository.sectionStudentMapping(entryData);

      const placement = await resolveClassSectionPlacementFromTermId(
        entryData.classSectionTermId,
      );
      if (placement?.classSectionsId) {
        await historyRepository.createHistory({
          studentId: id,
          classSectionsId: placement.classSectionsId,
          classSectionTermId: entryData.classSectionTermId,
          status: "current",
          createdBy,
        });
      }

      await studentRepository.updateStudentDetails(id, {
        classSectionTermId: entryData.classSectionTermId,
      });

      results.push(result);
    }

    return results;
  } catch (error) {
    console.error("Error in sectionStudentMapping:", error);
    throw error;
  }
}

export async function getSectionStudentMapping(classSectionTermId, academicYearId, term) {
  const rows = await studentRepository.getSectionStudentMapping(
    classSectionTermId,
    academicYearId,
    term,
  );
  return toPlainRows(rows);
}

export async function addElectiveSubject(data, createdBy) {
  data.createdBy = createdBy;
  return await studentRepository.addElectiveSubject(data);
}

function asPlain(record) {
  if (!record) return null;
  return record.get ? record.get({ plain: true }) : record;
}

async function getNextPromotionContext({ course, currentTerm, sourceacademicYearId }) {
  const termsPerYear = resolveTermsPerYear(course);
  if (!termsPerYear) {
    throw new Error(`Unsupported or missing term type: ${course.termType || "unknown"}`);
  }

  const totalTerms = resolveTotalTerms(course);
  const promotionStep = calculateNextPromotionTerm(currentTerm, termsPerYear, totalTerms);

  if (!promotionStep) {
    return {
      finalTerm: true,
      promotionStep: null,
      targetacademicYearId: sourceacademicYearId,
      termsPerYear,
      totalTerms,
    };
  }

  let targetacademicYearId = sourceacademicYearId;
  if (promotionStep.crossYear) {
    const nextYear = await studentRepository.getNextAcedmicYearAfter(sourceacademicYearId);
    if (!nextYear) {
      throw new Error("Next academic year not found");
    }
    targetacademicYearId = nextYear.academicYearId;
  }

  return {
    finalTerm: false,
    promotionStep,
    targetacademicYearId,
    termsPerYear,
    totalTerms,
  };
}

const TERMS_PER_YEAR_BY_TYPE = {
  SEMESTER: 2,
  QUARTERLY: 4,
  TRIMESTER: 3,
};

function resolveTermsPerYear(course) {
  if (!course) return null;

  const duration = Number(course.courseDuration);
  const totalTerms = Number(course.totalTerms);
  if (duration > 0 && totalTerms > 0 && totalTerms % duration === 0) {
    return totalTerms / duration;
  }

  const normalized = String(course.termType || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (normalized.includes("QUARTER")) return 4;
  if (normalized.includes("TRIMEST")) return 3;
  if (normalized.includes("SEMEST")) return 2;

  for (const [key, value] of Object.entries(TERMS_PER_YEAR_BY_TYPE)) {
    if (normalized.includes(key)) return value;
  }

  return null;
}

function resolveTotalTerms(course) {
  const totalTerms = Number(course?.totalTerms);
  if (totalTerms > 0) return totalTerms;

  const duration = Number(course?.courseDuration);
  const termsPerYear = resolveTermsPerYear(course);
  if (duration > 0 && termsPerYear) {
    return duration * termsPerYear;
  }

  return 0;
}

function calculateNextPromotionTerm(currentTerm, termsPerYear, totalTerms) {
  const term = Number(currentTerm);
  if (!Number.isInteger(term) || term <= 0) {
    throw new Error("term must be a positive integer");
  }
  if (!termsPerYear || termsPerYear <= 0) {
    throw new Error("Unable to determine terms per year for this course");
  }

  const maxTerms = Number(totalTerms);
  if (!maxTerms || term >= maxTerms) {
    return null;
  }

  const nextTerm = term + 1;
  const currentYearGroup = Math.ceil(term / termsPerYear);
  const nextYearGroup = Math.ceil(nextTerm / termsPerYear);

  return {
    nextTerm,
    crossYear: nextYearGroup > currentYearGroup,
  };
}

async function mapPromotionClassSectionRow(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  const term = resolveProgramTerm(plain);
  return {
    classSectionsId: plain.classSectionsId,
    name: plain.section,
    term,
    classSectionTermId: resolveClassSectionTermId(plain, term),
    sessionId: plain.sessionId,
    academicYearId: plain.academicYearId,
    specializationId: plain.specializationId,
  };
}

function buildStudentName({ firstName, middleName, lastName }) {
  return [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
}

function acedmicYearRef(academicYearId) {
  return academicYearId != null ? { academicYearId, yearTitle: null } : null;
}

function mapPromotionClassSection(section) {
  const plain = asPlain(section);
  if (!plain) {
    return null;
  }

  const term = resolveProgramTerm(plain);
  const programYear = resolveProgramYear(plain);
  return {
    classSectionsId: plain.classSectionsId,
    section: plain.section,
    class: programYear != null ? `Year ${programYear}` : null,
    term,
    sessionId: plain.sessionId,
    acedmicYear: acedmicYearRef(plain.academicYearId),
  };
}

function buildPromotionHistory(student) {
  const plain = asPlain(student);
  const entries = new Map();

  for (const row of plain.sectionHistory ?? []) {
    const classSection = mapPromotionClassSection(row.classSection);
    const termId = row.classSectionTermId ?? row.classSectionTerm?.classSectionTermId ?? null;
    if (!classSection?.classSectionsId && !termId) {
      continue;
    }
    const historyTerm = row.classSectionTerm?.term ?? classSection?.term ?? null;
    const key = termId != null
      ? `${termId}:${row.status}`
      : `${classSection.classSectionsId}:${historyTerm}:${row.status}`;
    entries.set(key, {
      promotionHistoryId: row.id,
      status: row.status,
      classSectionTermId: termId,
      term: historyTerm,
      classSection,
    });
  }

  const currentSection = mapPromotionClassSection(resolveStudentSection(plain));
  const currentTermId = plain.classSectionTermId ?? plain.studentClassSectionTerm?.classSectionTermId ?? null;
  if (currentSection?.classSectionsId || currentTermId) {
    const key = currentTermId != null
      ? `${currentTermId}:current`
      : `${currentSection.classSectionsId}:${currentSection?.term ?? ''}:current`;
    if (!entries.has(key)) {
      entries.set(key, {
        promotionHistoryId: null,
        status: 'current',
        classSectionTermId: currentTermId,
        term: plain.studentClassSectionTerm?.term ?? currentSection?.term ?? null,
        classSection: currentSection,
      });
    }
  }

  return [...entries.values()].sort((a, b) => {
    const termA = a.classSection?.term ?? Number.MAX_SAFE_INTEGER;
    const termB = b.classSection?.term ?? Number.MAX_SAFE_INTEGER;
    if (termA !== termB) {
      return termA - termB;
    }
    return String(a.status).localeCompare(String(b.status));
  });
}

function mapPromotionHistoryStudent(student) {
  const plain = asPlain(student);
  const promotionHistory = buildPromotionHistory(student);
  const admissionEntry = promotionHistory[0];

  return {
    studentId: plain.studentId,
    name: buildStudentName(plain),
    scholarNumber: plain.scholarNumber,
    enrollNumber: plain.enrollNumber ?? null,
    admissionDate: plain.admisssionDate ?? null,
    course: plain.course
      ? {
          courseId: plain.course.courseId,
          courseName: plain.course.courseName,
          termType: plain.course.termType,
        }
      : null,
    specialization: plain.specialization
      ? {
          specializationId: plain.specialization.specializationId,
          specializationName: plain.specialization.specializationName,
        }
      : null,
    programTerm: plain.studentClassSectionTerm
      ? {
          classSectionTermId: plain.studentClassSectionTerm.classSectionTermId,
          term: plain.studentClassSectionTerm.term,
          termName: plain.course?.termType
            ? buildTermName(plain.course.termType, plain.studentClassSectionTerm.term)
            : null,
        }
      : null,
    admissionYear: admissionEntry?.classSection?.acedmicYear ?? null,
    studentSections: mapPromotionClassSection(resolveStudentSection(plain)),
    promotionHistory,
  };
}

function collectPromotionYearIds(studentRow) {
  const ids = [];
  const push = (year) => {
    if (year?.academicYearId != null) {
      ids.push(year.academicYearId);
    }
  };

  push(studentRow.admissionYear);
  push(studentRow.studentSections?.acedmicYear);
  for (const entry of studentRow.promotionHistory ?? []) {
    push(entry.classSection?.acedmicYear);
  }
  return ids;
}

function applyPromotionYearTitles(studentRow, titleMap) {
  const fill = (year) => {
    if (year?.academicYearId != null) {
      year.yearTitle = titleMap.get(Number(year.academicYearId)) ?? null;
    }
  };

  fill(studentRow.admissionYear);
  fill(studentRow.studentSections?.acedmicYear);
  for (const entry of studentRow.promotionHistory ?? []) {
    fill(entry.classSection?.acedmicYear);
  }

  return studentRow;
}

async function mapPromotionHistoryStudents(rows) {
  const mapped = rows.map(mapPromotionHistoryStudent);
  const yearIds = mapped.flatMap(collectPromotionYearIds);
  const titleMap = await studentRepository.getAcademicYearTitlesByIds(yearIds);
  return mapped.map((row) => applyPromotionYearTitles(row, titleMap));
}

export async function getPromotionHistory(payload = {}) {
  const studentId =
    payload.studentId != null ? Number(payload.studentId) : null;

  if (studentId) {
    const student = await studentRepository.getPromotionStudentByStudentId(studentId);
    if (!student) {
      const error = new Error('Student not found');
      error.statusCode = 404;
      throw error;
    }
    return { data: toPlainRow(student) };
  }

  const page = Number(payload.page) || 1;
  const limit = Number(payload.limit) || 20;
  const { rows, totalCount, totalPages } =
    await studentRepository.getPromotionStudentList({
      page,
      limit,
      search: payload.search ?? payload.studentSearch,
      courseId: payload.courseId ?? payload.programCourseId,
      term:
        payload.term != null
          ? Number(payload.term)
          : payload.promotionTerm != null
            ? Number(payload.promotionTerm)
            : undefined,
    });

  const students = toPlainRows(rows);
  return {
    data: { students },
    pagination: { page, limit, total: totalCount, totalPages },
  };
}

export async function getPromotionStudentList(payload) {
  const result = await getPromotionHistory({
    ...payload,
    courseId: payload.courseId,
    search: payload.search,
    term: payload.term,
  });
  return {
    promotionStudents: result.data.students,
    pagination: result.pagination,
  };
}

export async function getAvailablePromotionSections({
  courseId,
  term,
  classSectionTermId,
}) {
  if (!courseId || term == null || classSectionTermId == null) {
    throw new Error("courseId, term and classSectionTermId are required");
  }

  const requestedTerm = Number(term);
  const termRow = await findClassSectionTermById(Number(classSectionTermId));
  if (!termRow) {
    throw new Error("classSectionTermId not found");
  }

  const termPlain = termRow.get ? termRow.get({ plain: true }) : termRow;
  const section = termPlain.classSection;
  if (!section) {
    throw new Error("classSectionTermId has no linked class section");
  }

  const currentTerm = Number(termPlain.term);
  if (!currentTerm) {
    throw new Error("classSectionTermId has no term");
  }

  if (section.courseId !== Number(courseId)) {
    throw new Error("Class section does not belong to the given course");
  }

  const course = await getCourseByCourseId(Number(courseId));
  if (!course) {
    throw new Error("Course not found");
  }

  const {
    finalTerm,
    promotionStep,
    targetacademicYearId,
    termsPerYear,
    totalTerms,
  } = await getNextPromotionContext({
    course,
    currentTerm,
    sourceacademicYearId: section.academicYearId,
  });

  let sectionsTerm;
  if (requestedTerm === currentTerm) {
    if (finalTerm) {
      return {
        finalTerm: true,
        currentTerm,
        promotedTerm: null,
        academicYearId: section.academicYearId,
        crossYear: false,
        classSections: [],
      };
    }
    sectionsTerm = promotionStep.nextTerm;
  } else if (!finalTerm && promotionStep && requestedTerm === promotionStep.nextTerm) {
    sectionsTerm = requestedTerm;
  } else {
    throw new Error(
      "term must be the student's current term or the next promotion term",
    );
  }

  const rows = await studentRepository.getPromotionClassSections({
    courseId: Number(courseId),
    academicYearId: targetacademicYearId,
    term: sectionsTerm,
    specializationId: section.specializationId ?? null,
    instituteId: section.instituteId,
  });

  return {
    finalTerm: false,
    currentTerm,
    promotedTerm: sectionsTerm,
    academicYearId: targetacademicYearId,
    crossYear: promotionStep.crossYear,
    termsPerYear,
    totalTerms,
    classSections: toPlainRows(rows),
  };
}

export async function promoteStudent(data) {
  if (!data?.studentId) {
    throw new Error("studentId is required");
  }
  if (!data?.classSectionTermId) {
    throw new Error("classSectionTermId is required");
  }

  const targetClassSectionTermId = Number(data.classSectionTermId);

  const studentDetail = await studentRepository.getStudentForPromate(data.studentId);
  if (!studentDetail) {
    throw new Error("Student not found");
  }

  const targetTermRow = await findClassSectionTermById(targetClassSectionTermId);
  if (!targetTermRow) {
    throw new Error("Target classSectionTermId not found");
  }

  const studentPlain = asPlain(studentDetail);
  const targetTermPlain = asPlain(targetTermRow);
  const targetSection = targetTermPlain.classSection;
  if (!targetSection) {
    throw new Error("Target class section not found for classSectionTermId");
  }

  const currentTermRow = studentPlain.studentClassSectionTerm;
  if (!currentTermRow?.term) {
    throw new Error("Student current term could not be determined");
  }
  const currentTerm = Number(currentTermRow.term);
  const currentSection = currentTermRow.classSection ?? resolveStudentSection(studentPlain);

  if (targetSection.instituteId !== studentPlain.instituteId) {
    throw new Error("Class section does not belong to the student's institute");
  }
  if (targetSection.courseId !== studentPlain.courseId) {
    throw new Error("Class section does not belong to the student's course");
  }
  if (
    studentPlain.specializationId &&
    targetSection.specializationId &&
    targetSection.specializationId !== studentPlain.specializationId
  ) {
    throw new Error("Class section specialization does not match the student");
  }

  const course = await getCourseByCourseId(studentPlain.courseId);
  if (!course) {
    throw new Error("Course not found");
  }

  const { finalTerm, promotionStep, targetacademicYearId } = await getNextPromotionContext({
    course,
    currentTerm,
    sourceacademicYearId: currentSection?.academicYearId,
  });

  if (finalTerm) {
    throw new Error("Student has already reached the final term");
  }

  const targetTerm = Number(targetTermPlain.term);
  if (targetTerm !== promotionStep.nextTerm) {
    throw new Error(
      "Target classSectionTermId must be the next term after the student's current term",
    );
  }
  if (Number(targetSection.academicYearId) !== Number(targetacademicYearId)) {
    throw new Error("Target class section academic year is invalid for this promotion");
  }

  const currentClassSectionTermId = Number(studentPlain.classSectionTermId);
  const currentAcademicYearId =
    currentSection?.academicYearId ??
    studentPlain.studentMapped?.[0]?.academicYearId ??
    studentPlain.studentSession?.academicYearId;

  const nextSessionId = targetSection.sessionId;
  const targetClassSectionsId = targetSection.classSectionsId;
  const oldClassSectionId =
    currentSection?.classSectionsId ?? currentTermRow.classSectionsId ?? null;
  const createdBy = data.createdBy ?? null;

  const transaction = await sequelize.transaction();
  try {
    const result = await studentRepository.promoteStudent(
      data.studentId,
      {
        classSectionTermId: targetClassSectionTermId,
        academicYearId: targetSection.academicYearId,
        sessionId: nextSessionId,
        classStudentMapperId: studentPlain.studentMapped?.[0]?.classStudentMapperId,
      },
      transaction,
    );

    if (oldClassSectionId) {
      await historyRepository.createHistory(
        {
          studentId: data.studentId,
          classSectionsId: oldClassSectionId,
          classSectionTermId: currentClassSectionTermId,
          status: "passed",
          createdBy,
        },
        transaction,
      );
    }

    await historyRepository.createHistory(
      {
        studentId: data.studentId,
        classSectionsId: targetClassSectionsId,
        classSectionTermId: targetClassSectionTermId,
        status: "current",
        createdBy,
      },
      transaction,
    );

    await transaction.commit();

    return {
      message: "Student promoted",
      result,
      promotion: {
        previous: {
          academicYearId: currentAcademicYearId,
          classSectionTermId: currentClassSectionTermId,
          classSectionsId: oldClassSectionId,
          sessionId: studentPlain.sessionId,
        },
        current: {
          academicYearId: targetSection.academicYearId,
          classSectionTermId: targetClassSectionTermId,
          classSectionsId: targetClassSectionsId,
          sessionId: nextSessionId,
        },
        crossYear: targetSection.academicYearId !== currentAcademicYearId,
      },
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
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

function toPlainRows(rows) {
  if (!Array.isArray(rows)) return rows;
  const result = [];
  for (const row of rows) {
    result.push(toPlainRow(row));
  }
  return result;
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
  const section = resolveStudentSection(s) ?? {};

  const studentInvoices = invoiceMap.get(s.studentId) ?? new Map();

  return {
    studentId: s.studentId,
    date: s.enrollDate ?? s.admisssionDate ?? null,
    studentName: formatStudentDisplayName(s),
    scholarNumber: s.scholarNumber,
    className:
      [section.year, section.section].filter(Boolean).join("") ||
      section.section ||
      (section.year != null ? String(section.year) : null) ||
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
    if (!(await studentRepository.assertStudentInRequestAcademicYear(studentId))) {
      return {
        studentInfo: {},
        personalInfo: {},
        parentInfo: {},
        invoices: [],
        summary: {},
      };
    }

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
      classSection: resolveStudentSection(student)?.section || "",
      term: student.studentClassSectionTerm?.term ?? resolveProgramTerm(resolveStudentSection(student)) ?? null,
      academicYear: student.studentSession?.sessionAcedmic?.yearTitle || "",
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
  if (!(await isStudentInAcademicYear(studentId))) {
    return { message: "No issued books found", books: [] };
  }

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
  const student =
    await studentRepository.getStudentDetailsRepository(studentId);

  if (!student) return { formatted: [] };

  const classSectionTermId = student.classSectionTermId
    ?? (typeof student.get === "function" ? student.get({ plain: true }) : student).classSectionTermId;

  if (!classSectionTermId) {
    return { formatted: [] };
  }

  const classSectionsId = resolveStudentClassSectionsId(
    typeof student.get === "function" ? student.get({ plain: true }) : student,
  );

  const subjectIds = classSectionsId
    ? await studentRepository.getSubjectIdsByClassSection(classSectionsId)
    : [];

  if (subjectIds.length === 0) return { formatted: [] };

  const timetable =
    await timeTableCreateRepository.getStudentTimeTableRepository(
      classSectionTermId,
      subjectIds,
    );

  return formatStudentTimetable(timetable);
}

function formatStudentTimetable(allData) {
  const allMappings = [];

  for (const item of allData) {
    const course = item.timeTableCourse || {};
    const classSection = resolveTimeTableRoutineSection(item) || {};

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
          class: classSection.year != null ? String(classSection.year) : "",
          section: classSection.section,
          classSectionsId: classSection.classSectionsId ?? null,
          classSectionTermId: item.classSectionTermId ?? null,
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

export async function getStudentsByClassSection({
  timeTableMappingId,
  date,
}) {
  try {
    const classScheduleItem = await model.classScheduleModel.findByPk(
      timeTableMappingId,
      {
        attributes: ["timeTableMappingId", "day", "timeTableType"],
        include: [
          {
            model: model.timeTableRoutineModel,
            as: "timeTablecreate",
            attributes: ["classSectionTermId"],
            include: [
              timeTableRoutineClassSectionInclude({
                sectionAttributes: ["classSectionsId", "section"],
              }),
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

    const classSectionTermId =
      classScheduleItem?.timeTablecreate?.classSectionTermId ?? null;
    if (!classSectionTermId) {
      const error = new Error(
        "classSectionTermId could not be resolved from timeTableMappingId",
      );
      error.statusCode = 400;
      throw error;
    }

    const students = await studentRepository.getStudentsByClassSection(
      classSectionTermId,
      timeTableMappingId,
      date,
    );

    const response = {
      classSectionTermId: Number(classSectionTermId),
      students: toPlainRows(students),
      classScheduleItem,
    };

    return response;
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

  const data = studentsdata.map((student) => toPlainRow(student));

  return data;
}
