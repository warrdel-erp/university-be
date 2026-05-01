import sequelize from '../database/sequelizeConfig.js';
import * as employeeRepository from '../repository/employeeRepository.js';
import * as employeeAddressRepository from '../repository/employeeAddressRepository.js';
import * as employeeOfficeRepository from '../repository/employeeOfficeRepository.js';
import * as employeeRoleRepository from '../repository/employeeRoleRepository.js';
import * as employeeSkillRepository from '../repository/employeeSkillRepository.js';
import * as employeeDocumentRepository from '../repository/employeeDocumentRepository.js';
import * as employeeQualificationRepository from '../repository/employeeQualificationRepository.js';
import * as employeeExperianceRepository from '../repository/employeeExperianceRepository.js';
import * as employeeAchivementRepository from '../repository/employeeAchivementRepository.js';
import * as employeeWardRepository from '../repository/employeeWardRepository.js';
import * as employeeActivityRepository from '../repository/employeeActivityRepository.js';
import * as employeeReferenceRepository from '../repository/employeeReferenceRepository.js';
import * as employeeResearchRepository from '../repository/employeeResearchRepository.js';
import * as employeeLongLeaveRepository from '../repository/employeeLongLeaveRepository.js';
import * as employeeMetaDataRepository from '../repository/employeeMetaDataRepository.js';
import * as employeeFilesRepository from '../repository/employeeFilesRepository.js';
import { uploadFile } from '../utility/awsServices.js';
import { employeeRegister } from '../services/userServices.js'
import * as registerRepository from "../repository/userRepository.js";
import * as userRoleService from '../services/userRoleService.js';
import { getCampusCode, getInstituteCode } from '../repository/collegeRepository.js';
import * as libraryRepository from '../repository/libraryCreationRepository.js';
import * as timeTableCreateRepository from '../repository/timeTablecreateRepository.js';
import * as evaluationRepository from "../repository/evalutionRepository.js";
import { getSingleRoleDetails } from '../repository/roleRepository.js';
import { addHead } from '../repository/headRepository.js';
import { countWeekdayInRange } from '../utility/helper.js';
import moment from 'moment';

async function generateEmployeeNumber(campusId, instituteId) {
  const getCampusCodeDetail = await getCampusCode(campusId);
  const getInstitueCodeDetail = await getInstituteCode(instituteId);
  const campusCode = getCampusCodeDetail.get('campus_code');
  const institueCode = getInstitueCodeDetail.get('institute_code');
  const getPreviousEnrollNumber = await employeeRepository.getPreviousEnrollNumber(institueCode);
  const previousEnrollNumber = getPreviousEnrollNumber ? getPreviousEnrollNumber.get('employee_Code') : null;
  let enrollNumber;
  if (previousEnrollNumber) {
    const enrollNumberParts = previousEnrollNumber.split('/');
    const enrollNumberPrefix = enrollNumberParts.slice(0, 3).join('/');
    const enrollNumberSuffix = parseInt(enrollNumberParts[3]) + 1;
    enrollNumber = `${enrollNumberPrefix}/${enrollNumberSuffix.toString().padStart(6, '0')}`;
  } else {
    const yearLastTwoDigits = moment().format('YY');
    enrollNumber = `${campusCode}/${institueCode}/${yearLastTwoDigits}/100001`;
  }
  return enrollNumber;
};

function normalizeLongLeaves(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      ...row,
      leaveType: row?.leaveType ?? row?.leave_type ?? null,
      DateOfLeaving: row?.DateOfLeaving ?? row?.dateOfLeaving ?? row?.fromDate ?? null,
      DateOfRejoining: row?.DateOfRejoining ?? row?.dateOfRejoining ?? row?.toDate ?? null,
      remark: row?.remark ?? row?.reason ?? null
    }))
    .filter((row) => Number.isInteger(Number(row?.leaveType)))
    .map((row) => ({
      leaveType: Number(row.leaveType),
      DateOfLeaving: row.DateOfLeaving,
      DateOfRejoining: row.DateOfRejoining,
      remark: row.remark
    }));
}

function normalizeActivities(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      activity: row?.activity ?? row?.activityName ?? null,
      monthYear: row?.monthYear ?? row?.date ?? null,
      remarks: row?.remarks ?? row?.description ?? row?.category ?? null
    }))
    .filter((row) => row.activity);
}

function normalizeAchievements(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      ...row,
      achievementCategory: row?.achievementCategory ?? row?.achievement_category ?? null
    }))
    .filter((row) => Number.isInteger(Number(row?.achievementCategory)))
    .map((row) => ({
      ...row,
      achievementCategory: Number(row.achievementCategory)
    }));
}

function normalizeDocumentAttachments(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      ...row,
      document: row?.document ?? row?.documentType ?? null
    }))
    .filter((row) => Number.isInteger(Number(row?.document)));
}

function toPlain(value) {
  return typeof value?.toJSON === "function" ? value.toJSON() : value;
}

function mapRoleData(authUser = {}) {
  const userRoles = authUser?.userRoles || [];
  const userPermissions = authUser?.userPermissions || [];
  return {
    role: userRoles?.[0]?.role || "",
    permissions: userPermissions.map((permissionItem) => permissionItem.permission).filter(Boolean)
  };
}

async function resolveOfficeEntry(item = {}) {
  const directOffice = await getEmployeeOfficeDetails(item?.employeeId);
  const directOfficeEntry = toPlain(directOffice) || {};
  const includedOffice = Array.isArray(item?.office) ? (item.office[0] || {}) : (item?.office || {});
  return Object.keys(directOfficeEntry).length > 0 ? directOfficeEntry : includedOffice;
}

function mapEmployment(item = {}, officeEntry = {}, addressEntry = {}) {
  return {
    department: item?.department || "",
    employmentType: item?.employmentType || "",
    joiningDate: officeEntry?.joiningDate || "",
    noticePeriod: officeEntry?.noticePeriod ?? "",
    employeeFileNumber: officeEntry?.employeeFileNumber || "",
    officeMailId: officeEntry?.officeMailId || addressEntry?.officalEmailId || "",
    officeExtensionNumber: officeEntry?.officeExtensionNumber || "",
    employeeRank: officeEntry?.employeeRank || ""
  };
}

function getMetaCode(item = {}, type) {
  return item?.employeeMetaData?.find((metaItem) =>
    String(metaItem?.typess?.codes?.codeMasterType || "").trim().toLowerCase() === type
  )?.typess?.code || "";
}

function mapActivityForEmployeeDetails(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((activity) => ({
    ...activity,
    activityName: activity?.activityName ?? activity?.activity ?? "",
    date: activity?.date ?? activity?.monthYear ?? "",
    description: activity?.description ?? activity?.remarks ?? "",
    category: activity?.category ?? ""
  }));
}

function mapLongLeaveForEmployeeDetails(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((leave) => ({
    ...leave,
    leaveType: leave?.leaveType ?? leave?.leave_type ?? "",
    fromDate: leave?.fromDate ?? leave?.dateOfLeaving ?? leave?.DateOfLeaving ?? "",
    toDate: leave?.toDate ?? leave?.dateOfRejoining ?? leave?.DateOfRejoining ?? "",
    reason: leave?.reason ?? leave?.remark ?? ""
  }));
}

export async function addEmployee(data, files, createdBy, universityId, roleId, instituteId) {

  const transaction = await sequelize.transaction();
  try {
    const address = data.address ? JSON.parse(data.address) : null;
    const corsAddress = data.corsAddress ? JSON.parse(data.corsAddress) : null;
    const office = data.office ? JSON.parse(data.office) : null;
    const normalizedOffice = office ? {
      ...office,
      employeeRank: office.employeeRank ?? data.salutation ?? data.designation ?? null
    } : null;

    const roleData = data.roleData ? JSON.parse(data.roleData) : null;
    const skills = data.skill ? JSON.parse(data.skill) : [];
    const documents = data.documents ? JSON.parse(data.documents) : [];
    const qualifications = data.qualification ? JSON.parse(data.qualification) : [];
    const experiences = data.experience ? JSON.parse(data.experience) : [];
    const achievementsRaw = data.achievements ? JSON.parse(data.achievements) : [];
    const achievements = normalizeAchievements(achievementsRaw);
    const wards = data.ward ? JSON.parse(data.ward) : [];
    const activitiesRaw = data.activity ? JSON.parse(data.activity) : [];
    const activities = normalizeActivities(activitiesRaw);
    const references = data.reference ? JSON.parse(data.reference) : [];
    const research = data.research ? JSON.parse(data.research) : [];
    const longLeavesRaw = data.longLeave ? JSON.parse(data.longLeave) : [];
    const longLeaves = normalizeLongLeaves(longLeavesRaw);


    // const roleDetails = await getSingleRoleDetails(roleId)
    // const roleName = roleDetails.dataValues.role
    // let finalRegisterRoleId = roleId;

    // if (roleName?.trim().toLowerCase() === 'admin') {
    //   finalRegisterRoleId = 13;
    // }

    const employeePersonalDetail = {
      personalEmail: address?.officalEmailId || address?.officialEmailId,
      mobileNumber: address?.mobileNumber
    }

    const employeeRegisterData = {
      universityId,
      // roleId: finalRegisterRoleId,
      employeeName: data.employeeName,
      employeeId: null,
      instituteId
    }

    const userId = await employeeRegister(employeePersonalDetail, employeeRegisterData, transaction);

    // Add user role entry 
    if (roleData) {
      await userRoleService.assignRoleToUser(userId, roleData.role, roleData.permissions, transaction);
    } else {
      throw new Error("Role data is required")
    }

    // Add employee 
    data.createdBy = createdBy
    data.userId = userId;
    data.roleId = null;
    data.employeeCode = await generateEmployeeNumber(data.campusId, data.instituteId)
    const employee = await employeeRepository.addEmployee(data, transaction);
    const employeeId = employee.dataValues.employeeId;

    // Associate user and employee
    await registerRepository.adminUser({ userId: userId, employeeId: employeeId }, transaction);

    const { campusId, employeeName, employmentType } = employee.dataValues


    // image upload
    if (files) {
      const uploadPromises = Object.keys(files).map(async key => {
        const file = files[key];
        const s3Response = await uploadFile(file);
        const url = s3Response.Location;
        const data = { key, url, employeeId, createdBy };
        await employeeFilesRepository.addEmployeeFiles(data, transaction);
      });

      await Promise.all(uploadPromises);
    }

    // Add employee address
    const addressDetail = await employeeAddressRepository.addAddress({
      employeeId,
      createdBy,
      ...address
    }, transaction);
    const { personalEmail, mobileNumber, officalMobileNumber, officalEmailId } = addressDetail.dataValues

    // Normalize correspondence address keys for FE compatibility
    const normalizedCorsAddress = corsAddress ? {
      ...corsAddress,
      address: corsAddress.address ?? corsAddress.cAddress ?? null,
      pincode: corsAddress.pincode ?? corsAddress.cPincode ?? null
    } : null;

    // Add employee cor-address
    await employeeAddressRepository.addCorsAddress({
      employeeId,
      createdBy,
      ...normalizedCorsAddress
    }, transaction);

    // Add employee office details
    await employeeOfficeRepository.addOfficeDetails({
      employeeId,
      createdBy,
      ...normalizedOffice
    }, transaction);

    // Add employee roles
    // for (const roles of role) {
    //     await employeeRoleRepository.addEmployeeRole({
    //         employeeId,
    //         createdBy,
    //         roles
    //     }, transaction);
    // }

    // Add employee skills
    for (const skill of skills) {
      await employeeSkillRepository.addEmployeeSkill({
        employeeId,
        createdBy,
        ...skill
      }, transaction);
    }

    // Add employee documents (frontend "documents" tab) -> employee_qualification table
    const validDocsForQualification = normalizeDocumentAttachments(documents || []).filter((doc) => doc?.receivedDate);
    for (const document of validDocsForQualification) {
      await employeeQualificationRepository.addEmployeeQualification({
        employeeId,
        createdBy,
        ...document
      }, transaction);
    }

    // Add employee qualifications (frontend "qualification" tab) -> employee_documents table
    const validQualificationsForDocuments = (qualifications || [])
      .filter((q) => q?.qualifications && q?.degreeLevel)
      .map((q) => ({
        ...q,
        // Backward-compatible fallback for non-null stream column in some DBs
        stream: q?.stream ?? q?.degreeLevel
      }));
    for (const qualification of validQualificationsForDocuments) {
      await employeeDocumentRepository.addEmployeeDocuments({
        employeeId,
        createdBy,
        ...qualification
      }, transaction);
    }

    // Add employee experiences
    for (const experience of experiences) {
      await employeeExperianceRepository.addEmployeeExperiance({
        employeeId,
        createdBy,
        ...experience
      }, transaction);
    }

    // Add employee achievements
    for (const achievement of achievements) {
      await employeeAchivementRepository.addEmployeeAchievement({
        employeeId,
        createdBy,
        ...achievement
      }, transaction);
    }

    // Add employee wards
    for (const ward of wards) {
      await employeeWardRepository.addEmployeeWard({
        employeeId,
        createdBy,
        ...ward
      }, transaction);
    }

    // Add employee activities
    for (const activity of activities) {
      await employeeActivityRepository.addEmployeeActivity({
        employeeId,
        createdBy,
        ...activity
      }, transaction);
    }

    // Add employee references
    for (const reference of references) {
      await employeeReferenceRepository.addEmployeeReference({
        employeeId,
        createdBy,
        ...reference
      }, transaction);
    }

    // Add employee research
    for (const researchItem of research) {
      await employeeResearchRepository.addEmployeeResearch({
        employeeId,
        createdBy,
        ...researchItem
      }, transaction);
    }

    // Add employee long leaves
    for (const longLeave of longLeaves) {
      await employeeLongLeaveRepository.addEmployeeLongLeave({
        employeeId,
        createdBy,
        ...longLeave
      }, transaction);
    }

    //  allDropDownData
    if (data.allDropDownData) {
      const allDropDownDataObject = typeof data.allDropDownData === 'string'
        ? JSON.parse(data.allDropDownData)
        : data.allDropDownData;

      if (typeof allDropDownDataObject === 'object' && Array.isArray(allDropDownDataObject.type) && Array.isArray(allDropDownDataObject.code)) {
        const type = allDropDownDataObject.type;
        const code = allDropDownDataObject.code;

        if (type.length !== code.length) {
          throw new Error('Types and codes arrays must be of the same length.');
        }

        const entries = type.map((types, index) => ({
          employeeId,
          createdBy,
          types,
          codes: code[index]
        }));

        await employeeMetaDataRepository.employeeMetaData(entries, transaction);
      } else {
        throw new Error('Invalid format for allDropDownData.');
      }
    }


    if (roleData?.role?.trim().toLowerCase() === 'admin') {
      const data = { campusId, instituteId, universityId, createdBy, updatedBy: createdBy, headName: employeeName, mobileNumber, alternateNumber: officalMobileNumber, registerEmail: officalEmailId, alternateEmail: personalEmail, isAdmin: true, designation: 'Admin' }
      await addHead(data, transaction)
    }
    // Commit transaction
    await transaction.commit();
    return { message: "Employee data successfully added" };
  } catch (error) {
    // Rollback transaction in case of error
    await transaction.rollback();
    console.error('Error adding employee data:', error);
    throw new Error('Failed to add employee data');
  }
};
// addEmployee(data,1)

export async function getAllEmployee(universityId, campusId, instituteId, acedmicYearId, headInstituteId, role) {
  const result = await employeeRepository.getAllEmployee(universityId, campusId, instituteId, acedmicYearId, headInstituteId, role);
  return Promise.all((result || []).map(async (row) => {
    const item = toPlain(row) || {};
    const authUser = item?.user || item?.userEmployee || {};
    const mappedRoleData = mapRoleData(authUser);
    const officeEntry = await resolveOfficeEntry(item);
    const addressEntry = Array.isArray(item?.address) ? (item.address[0] || {}) : (item?.address || {});
    const employment = mapEmployment(item, officeEntry, addressEntry);

    return {
      employeeId: item?.employeeId,
      userId: item?.userId,
      employeeCode: item?.employeeCode,
      employeeName: item?.employeeName || "",
      dateOfBirth: item?.dateOfBirth || "",
      department: item?.department || "",
      employmentType: item?.employmentType || "",
      pickColor: item?.pickColor || "",
      campusId: item?.campusId,
      instituteId: item?.instituteId,
      acedmicYearId: item?.acedmicYearId,
      roleId: item?.roleId || mappedRoleData?.role || "",
      roleData: mappedRoleData,
      role: mappedRoleData?.role ? [mappedRoleData.role] : (item?.role || []),
      joiningDate: employment.joiningDate,
      gender: getMetaCode(item, "gender"),
      religion: getMetaCode(item, "religion"),
      nationality: getMetaCode(item, "nationality"),
      employment
    };
  }));
};

export async function getSingleEmployeeDetails(employeeId, universityId) {
  const result = await employeeRepository.getSingleEmployeeDetails(employeeId, universityId);
  return Promise.all((result || []).map(async (row) => {
    const item = toPlain(row) || {};
    const authUser = item?.user || item?.userEmployee || {};
    const mappedRoleData = mapRoleData(authUser);
    const mappedQualification = Array.isArray(item?.qualification) ? item.qualification : [];
    const mappedDocuments = Array.isArray(item?.documents) ? item.documents : [];
    const officeEntry = await resolveOfficeEntry(item);
    const referenceList = (Array.isArray(item?.reference) && item.reference.length > 0)
      ? item.reference
      : (await getEmployeeReferenceDetails(item?.employeeId))?.map(toPlain) || [];
    const skillList = (Array.isArray(item?.skill) && item.skill.length > 0)
      ? item.skill
      : (await getEmployeeSkillDetails(item?.employeeId))?.map(toPlain) || [];
    const qualificationList = (Array.isArray(mappedQualification) && mappedQualification.length > 0)
      ? mappedQualification
      : (await getEmployeeDocumentDetails(item?.employeeId))?.map(toPlain) || [];
    const documentList = (Array.isArray(mappedDocuments) && mappedDocuments.length > 0)
      ? mappedDocuments
      : (await getEmployeeQualificationDetails(item?.employeeId))?.map(toPlain) || [];
    const experienceList = (Array.isArray(item?.experiance) && item.experiance.length > 0)
      ? item.experiance
      : (await getEmployeeExperienceDetails(item?.employeeId))?.map(toPlain) || [];
    const achievementList = (Array.isArray(item?.achievements) && item.achievements.length > 0)
      ? item.achievements
      : (await getEmployeeAchievementDetails(item?.employeeId))?.map(toPlain) || [];
    const researchList = (Array.isArray(item?.research) && item.research.length > 0)
      ? item.research
      : (await getEmployeeResearchList(item?.employeeId))?.map(toPlain) || [];
    const activityList = (Array.isArray(item?.activty) && item.activty.length > 0)
      ? item.activty
      : (await getEmployeeActivityDetails(item?.employeeId))?.map(toPlain) || [];
    const longLeaveList = (Array.isArray(item?.longLeave) && item.longLeave.length > 0)
      ? item.longLeave
      : (await getEmployeeLongLeaveDetails(item?.employeeId))?.map(toPlain) || [];
    const addressEntry = Array.isArray(item?.address) ? (item.address[0] || {}) : (item?.address || {});
    const employment = mapEmployment(item, officeEntry, addressEntry);
    const { office: _officeIgnored, ...itemWithoutOffice } = item;

    return {
      ...itemWithoutOffice,
      userEmployee: authUser,
      roleData: mappedRoleData,
      roleId: item?.roleId || mappedRoleData?.role || "",
      role: mappedRoleData?.role ? [mappedRoleData.role] : (item?.role || []),
      employment,
      salutation: officeEntry?.employeeRank || "",
      designation: officeEntry?.employeeRank || "",
      qualification: qualificationList,
      documents: documentList,
      skill: skillList,
      reference: referenceList,
      experience: experienceList,
      achievements: achievementList,
      research: researchList,
      longLeave: mapLongLeaveForEmployeeDetails(longLeaveList),
      activity: mapActivityForEmployeeDetails(activityList)
    };
  }));
};

export async function deleteEmployeeDetail(employeeId) {
  try {

    const [
      deleteEmployeeDetails,
      deleteEmployeeAddresses,
      deleteEmployeeOffices,
      deleteEmployeeRoles,
      deleteEmployeeSkills,
      deleteEmployeeDocuments,
      deleteEmployeeQualifications,
      deleteEmployeeExperiences,
      deleteEmployeeAchievements,
      deleteEmployeeWards,
      deleteEmployeeActivities,
      deleteEmployeeReferences,
      deleteEmployeeLongLeaves,
      deleteEmployeeMetaData
    ] = await Promise.all([
      employeeRepository.deleteEmployeeDetail(employeeId),
      employeeAddressRepository.deleteEmployeeAddress(employeeId),
      employeeOfficeRepository.deleteEmployeeOffice(employeeId),
      employeeRoleRepository.deleteEmployeeRole(employeeId),
      employeeSkillRepository.deleteEmployeeSkill(employeeId),
      employeeDocumentRepository.deleteEmployeeDocuments(employeeId),
      employeeQualificationRepository.deleteEmployeeQualification(employeeId),
      employeeExperianceRepository.deleteEmployeeExperiance(employeeId),
      employeeAchivementRepository.deleteEmployeeAchievement(employeeId),
      employeeWardRepository.deleteEmployeeWard(employeeId),
      employeeActivityRepository.deleteEmployeeActivity(employeeId),
      employeeReferenceRepository.deleteEmployeeReference(employeeId),
      employeeLongLeaveRepository.deleteEmployeeLongLeave(employeeId),
      employeeMetaDataRepository.deleteEmployeeMetaData(employeeId)
    ]);

    const results = [
      deleteEmployeeDetails,
      deleteEmployeeAddresses,
      deleteEmployeeOffices,
      deleteEmployeeRoles,
      deleteEmployeeSkills,
      deleteEmployeeDocuments,
      deleteEmployeeQualifications,
      deleteEmployeeExperiences,
      deleteEmployeeAchievements,
      deleteEmployeeWards,
      deleteEmployeeActivities,
      deleteEmployeeReferences,
      deleteEmployeeLongLeaves,
      deleteEmployeeMetaData
    ];

    const allDeleted = results.every(result => result !== null);

    if (allDeleted) {
      return { message: 'Employee and related records deleted successfully' };
    } else {
      return { message: 'Some records were not found or not deleted' };
    }
  } catch (error) {
    console.error('Error deleting employee:', error);
    return { message: 'An error occurred while trying to delete the employee', error: error.message };
  }
};

function validateEmployeeRow(employee) {
  const requiredFields = [
    "employeeName",
    "Gender",
    "campusId",
    "instituteId",
    "roleId",
    "acedmicYearId",
    "createdBy",
    "department",
    "employmentType",
  ];

  for (const field of requiredFields) {
    if (!employee[field] || employee[field] === "") {
      return `Missing required field: ${field}`;
    }
  }

  return null;
};


export async function importEmployeeData(excelData, commonData) {
  const transaction = await sequelize.transaction();

  try {
    for (const [index, employee] of excelData.entries()) {
      const convertedData = { ...employee, ...commonData };

      const error = validateEmployeeRow(convertedData);
      if (error) {
        throw new Error(`Row ${index + 1} (${employee.employeeName || "Unknown"}): ${error}`);
      }
    }

    for (const employee of excelData) {
      const convertedData = { ...employee, ...commonData };
      const employeeCode = generateEmployeeNumber(convertedData.campusId, commonData.instituteId)

      const employeeData = {
        employeeName: convertedData.employeeName,
        employeeCode: convertedData.employeeCode ? convertedData.employeeCode : employeeCode,
        employmentType: convertedData.employmentType,
        dateOfBirth: convertedData.dateOfBirth,
        fatherName: convertedData.fatherName,
        department: convertedData.department,
        motherName: convertedData.motherName,
        pickColor: convertedData.pickColor,
        campusId: convertedData.campusId,
        instituteId: convertedData.instituteId,
        roleId: convertedData.roleId,
        acedmicYearId: convertedData.acedmicYearId,
        createdBy: convertedData.createdBy,
      };

      const officeData = {
        joiningDate: convertedData.joiningDate,
        confirmationDate: convertedData.confirmationDate,
        relievingDate: convertedData.relievingDate,
        retirementDate: convertedData.retirementDate,
        employeeFileNumber: convertedData.employeeFileNumber,
        noticePeriod: convertedData.noticePeriod,
        createdBy: convertedData.createdBy,
      };

      const addressData = {
        pAddress: convertedData.pAddress,
        pPincode: convertedData.pPincode,
        // pCountry: convertedData.pCountry,
        // pState: convertedData.pState,
        // pCity: convertedData.pCity,
        phoneNumber: convertedData.phoneNumber,
        mobileNumber: convertedData.mobileNumber,
        officalMobileNumber: convertedData.officalMobileNumber,
        officalEmailId: convertedData.officalEmailId,
        personalEmail: convertedData.personalEmail,
        createdBy: convertedData.createdBy,
      };


      const result = await employeeRepository.createEmployeeWithDetails(employeeData, officeData, addressData, transaction);
      const employeeId = result.dataValues.employeeId


      const employeeRegisterData = {
        instituteId: convertedData.instituteId,
        roleId: convertedData.roleId,
        employeeName: convertedData.employeeName,
        universityId: convertedData.universityId,
        employeeId
      }
      const employeePersonalDetail = {
        officalEmailId: convertedData.officalEmailId,
        mobileNumber: convertedData.mobileNumber
      }

      const userId = await employeeRegister(employeePersonalDetail, employeeRegisterData, transaction);
      await employeeRepository.updateEmployee(employeeId, { userId }, transaction);

    }

    await transaction.commit();
    return { success: true, message: "All employees imported successfully" };

  } catch (error) {
    await transaction.rollback();
    console.error("Error in importing employee data:", error.message);
    return { success: false, error: error.message };
  }
};
export async function updateEmployee(employeeId, data, files, updatedBy, createdBy, universityId, roleId, instituteId) {

  const transaction = await sequelize.transaction();
  try {

    const address = typeof data.address === 'string' && data.address ? JSON.parse(data.address) : data.address || null;
    const corsAddress = typeof data.corsAddress === 'string' && data.corsAddress ? JSON.parse(data.corsAddress) : data.corsAddress || null;
    const office = typeof data.office === 'string' && data.office ? JSON.parse(data.office) : data.office || null;
    const normalizedOffice = office ? {
      ...office,
      employeeRank: office.employeeRank ?? data.salutation ?? data.designation ?? null
    } : null;


    // array
    const skills = typeof data.skill === 'string' && data.skill ? JSON.parse(data.skill) : data.skill || [];
    const documents = typeof data.documents === 'string' && data.documents ? JSON.parse(data.documents) : data.documents || [];
    const qualifications = typeof data.qualification === 'string' && data.qualification ? JSON.parse(data.qualification) : data.qualification || [];
    const experiences = typeof data.experience === 'string' && data.experience ? JSON.parse(data.experience) : data.experience || [];
    const achievementsRaw = typeof data.achievements === 'string' && data.achievements ? JSON.parse(data.achievements) : data.achievements || [];
    const achievements = normalizeAchievements(achievementsRaw);
    const wards = typeof data.ward === 'string' && data.ward ? JSON.parse(data.ward) : data.ward || [];
    const activitiesRaw = typeof data.activity === 'string' && data.activity ? JSON.parse(data.activity) : data.activity || [];
    const activities = normalizeActivities(activitiesRaw);
    const references = typeof data.reference === 'string' && data.reference ? JSON.parse(data.reference) : data.reference || [];
    const research = typeof data.research === 'string' && data.research ? JSON.parse(data.research) : data.research || [];
    const longLeavesRaw = typeof data.longLeave === 'string' && data.longLeave ? JSON.parse(data.longLeave) : data.longLeave || [];
    const longLeaves = normalizeLongLeaves(longLeavesRaw);
    const allDropDownData = typeof data.allDropDownData === 'string' && data.allDropDownData ? JSON.parse(data.allDropDownData) : data.allDropDownData || { type: [], code: [] };

    //  Update main employee table
    const { roleId: _excludedRoleId, ...employeeUpdateData } = data; // roleId is a string ("ADMIN"), not an int FK — exclude it
    await employeeRepository.updateEmployee(employeeId, {
      ...employeeUpdateData,
      roleId: null,  // role_id in employee table is always null; role is managed via user_roles table
      updatedBy
    }, transaction);

    //  Upload/update files
    if (files) {
      const uploadPromises = Object.keys(files).map(async key => {
        const file = files[key];
        const s3Response = await uploadFile(file);
        const url = s3Response.Location;
        const fileData = { key, url, employeeId, updatedBy };
        await employeeFilesRepository.updateEmployee(employeeId, fileData, transaction);
      });
      await Promise.all(uploadPromises);
    }

    //  Update Address
    if (address) {
      const addressPayload = {
        updatedBy,
        ...address
      };
      const addressUpdateResult = await employeeAddressRepository.updateAddress(
        employeeId,
        addressPayload,
        transaction
      );
      const updatedAddressCount = Array.isArray(addressUpdateResult) ? (addressUpdateResult[0] || 0) : 0;
      if (updatedAddressCount === 0) {
        await employeeAddressRepository.addAddress({
          employeeId,
          createdBy,
          ...address
        }, transaction);
      }
    }

    const normalizedCorsAddress = corsAddress ? {
      ...corsAddress,
      address: corsAddress.address ?? corsAddress.cAddress ?? null,
      pincode: corsAddress.pincode ?? corsAddress.cPincode ?? null
    } : null;

    if (normalizedCorsAddress) {
      const corsAddressPayload = {
        updatedBy,
        ...normalizedCorsAddress
      };
      const corsUpdateResult = await employeeAddressRepository.updateCorsAddress(
        employeeId,
        corsAddressPayload,
        transaction
      );
      const updatedCorsCount = Array.isArray(corsUpdateResult) ? (corsUpdateResult[0] || 0) : 0;
      if (updatedCorsCount === 0) {
        await employeeAddressRepository.addCorsAddress({
          employeeId,
          createdBy,
          ...normalizedCorsAddress
        }, transaction);
      }
    }

    //  Update Office details
    if (normalizedOffice) {
      const officePayload = {
        updatedBy,
        ...normalizedOffice
      };

      const existingOffice = await employeeOfficeRepository.getEmployeeOfficeByEmployeeId(employeeId);

      if (existingOffice?.employeeOfficeId) {
        await employeeOfficeRepository.updateOfficeDetailsById(
          existingOffice.employeeOfficeId,
          officePayload,
          transaction
        );
      } else {
        await employeeOfficeRepository.addOfficeDetails({
          employeeId,
          createdBy,
          ...normalizedOffice
        }, transaction);
      }
    }

    // Update Skills:
    // If FE sends skill key (including []), treat it as source of truth and refresh.
    const hasSkillField = Object.prototype.hasOwnProperty.call(data, 'skill');
    const hasDocumentsField = Object.prototype.hasOwnProperty.call(data, 'documents');
    const hasQualificationField = Object.prototype.hasOwnProperty.call(data, 'qualification');
    const hasExperienceField = Object.prototype.hasOwnProperty.call(data, 'experience');
    const hasAchievementsField = Object.prototype.hasOwnProperty.call(data, 'achievements');
    const hasWardField = Object.prototype.hasOwnProperty.call(data, 'ward');
    const hasActivityField = Object.prototype.hasOwnProperty.call(data, 'activity');
    const hasReferenceField = Object.prototype.hasOwnProperty.call(data, 'reference');
    const hasResearchField = Object.prototype.hasOwnProperty.call(data, 'research');
    const hasLongLeaveField = Object.prototype.hasOwnProperty.call(data, 'longLeave');
    if (hasSkillField) {
      await employeeSkillRepository.refreshEmployeeSkills(
        employeeId,
        skills,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update Documents (frontend "documents" tab) -> employee_qualification table
    const validDocsForQualification = normalizeDocumentAttachments(documents || []).filter((doc) => doc?.receivedDate);
    if (hasDocumentsField) {
      await employeeQualificationRepository.refreshEmployeeQualifications(
        employeeId,
        validDocsForQualification,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update Qualifications (frontend "qualification" tab) -> employee_documents table
    const validQualificationsForDocuments = (qualifications || [])
      .filter((q) => q?.qualifications && q?.degreeLevel)
      .map((q) => ({
        ...q,
        stream: q?.stream ?? q?.degreeLevel
      }));
    if (hasQualificationField) {
      await employeeDocumentRepository.refreshEmployeeDocuments(
        employeeId,
        validQualificationsForDocuments,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update Experiences
    if (hasExperienceField) {
      await employeeExperianceRepository.refreshEmployeeExperiences(
        employeeId,
        experiences,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update Achievements
    if (hasAchievementsField) {
      await employeeAchivementRepository.refreshEmployeeAchievements(
        employeeId,
        achievements,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update Wards
    if (hasWardField) {
      await employeeWardRepository.refreshEmployeeWards(
        employeeId,
        wards,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update Activities
    if (hasActivityField) {
      await employeeActivityRepository.refreshEmployeeActivities(
        employeeId,
        activities,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update References
    if (hasReferenceField) {
      await employeeReferenceRepository.refreshEmployeeReferences(
        employeeId,
        references,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update Research
    if (hasResearchField) {
      await employeeResearchRepository.refreshEmployeeResearch(
        employeeId,
        research,
        createdBy,
        updatedBy,
        transaction
      );
    }

    //  Update Long Leaves
    if (hasLongLeaveField) {
      await employeeLongLeaveRepository.refreshEmployeeLongLeaves(
        employeeId,
        longLeaves,
        createdBy,
        updatedBy,
        transaction
      );
    }

    //  Dropdown data
    if (data.allDropDownData) {
      const allDropDownDataObject = typeof data.allDropDownData === "string"
        ? JSON.parse(data.allDropDownData)
        : data.allDropDownData;

      if (Array.isArray(allDropDownDataObject.type) && Array.isArray(allDropDownDataObject.code)) {
        const type = allDropDownDataObject.type;
        const code = allDropDownDataObject.code;

        const entries = type.map((types, index) => ({
          employeeId,
          createdBy,
          updatedBy,
          types,
          codes: code[index]
        }));

        await employeeMetaDataRepository.updateEmployeeMetaData(entries, transaction);
      }
    }

    await transaction.commit();
    return { message: "Employee data successfully updated" };
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating employee data:", error);
    throw new Error("Failed to update employee data");
  }
};

export async function getEmployeeOfficeDetails(employeeId) {
  return await employeeOfficeRepository.getEmployeeOfficeByEmployeeId(employeeId);
}

export async function getEmployeeReferenceDetails(employeeId) {
  return await employeeReferenceRepository.getEmployeeReferencesByEmployeeId(employeeId);
}

export async function getEmployeeSkillDetails(employeeId) {
  return await employeeSkillRepository.getEmployeeSkillsByEmployeeId(employeeId);
}

export async function getEmployeeDocumentDetails(employeeId) {
  return await employeeDocumentRepository.getEmployeeDocumentsByEmployeeId(employeeId);
}

export async function getEmployeeQualificationDetails(employeeId) {
  return await employeeQualificationRepository.getEmployeeQualificationsByEmployeeId(employeeId);
}

export async function getEmployeeExperienceDetails(employeeId) {
  return await employeeExperianceRepository.getEmployeeExperiencesByEmployeeId(employeeId);
}

export async function getEmployeeAchievementDetails(employeeId) {
  return await employeeAchivementRepository.getEmployeeAchievementsByEmployeeId(employeeId);
}

export async function getEmployeeResearchList(employeeId) {
  return await employeeResearchRepository.getEmployeeResearchByEmployeeId(employeeId);
}

export async function getEmployeeActivityDetails(employeeId) {
  return await employeeActivityRepository.getEmployeeActivitiesByEmployeeId(employeeId);
}

export async function getEmployeeLongLeaveDetails(employeeId) {
  return await employeeLongLeaveRepository.getEmployeeLongLeavesByEmployeeId(employeeId);
}

export async function getBooksIssuedToEmployee(employeeId) {
  const rawData = await libraryRepository.getBooksIssuedToEmployee(employeeId);
  if (!rawData || rawData.length === 0) {
    return { message: "No issued books found", books: [] };
  }

  const employeeDetails = rawData[0].employeeDetails
    || rawData[0].employeeDetailsBook
    || null;

  const groupedBooks = {};

  rawData.forEach(item => {
    const bookId = item.bookDetails.libraryBookId;

    if (!groupedBooks[bookId]) {
      groupedBooks[bookId] = {
        bookDetails: item.bookDetails,
        inventory: []
      };
    }

    groupedBooks[bookId].inventory.push({
      inventoryId: item.inventoryId,
      barcode: item.barcode,
      issueDate: item.issueDate,
      dueDate: item.dueDate,
      status: item.status,
      createdAt: item.createdAt
    });
  });

  return {
    employeeDetails,
    books: Object.values(groupedBooks)
  };
};

export async function getTeacherTimeTable(employeeId, universityId, instituteId, role) {

  const allData = await timeTableCreateRepository.getTeacherTimeTable(
    employeeId,
    universityId,
    instituteId,
    role
  );

  const allMappings = [];

  for (const item of allData) {

    const course = item.timeTableCourse || {};
    const classSection = item.timeTableClassSection || {};

    (item.timeTablecreate || []).forEach(period => {

      const {
        day,
        timeTableMappingId,
        isSameTeacher,
        timeTableCreationId,
        timeTableType,
        timeTablecreation,
        timeTableSubject,
        employeeDetails,
        timeTableTeacherSubject,
        timeTableElective
      } = period;

      const sameTeacher = isSameTeacher;

      const subjectData = sameTeacher
        ? timeTableTeacherSubject?.employeeSubject?.subjects
        : timeTableSubject;

      const teacherData = sameTeacher
        ? timeTableTeacherSubject?.teacherEmployeeData
        : employeeDetails;

      const mappingEntry = {
        timeTableMappingId,
        employeeId: teacherData?.employeeId,
        employeeName: teacherData?.employeeName,
        employeeCode: teacherData?.employeeCode,
        pickColor: teacherData?.pickColor,
        timeTableType,
        subject: timeTableElective
          ? {
            subjectId: timeTableElective?.electiveSubjectId,
            Name: timeTableElective?.electiveSubjectName,
            Code: timeTableElective?.electiveSubjectCode
          }
          : {
            subjectId: subjectData?.subjectId,
            Name: subjectData?.subjectName,
            Code: subjectData?.subjectCode
          }
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
          startingDate: item.startingDate,
          endingDate: item.endingDate,
          timeTableType
        }
      });

    });

  }

  const finalOutput = [];

  allMappings.forEach(curr => {

    const type = curr.mappingEntry.timeTableType;

    let record = finalOutput.find(r => r.timeTableType === type);

    if (!record) {
      record = {
        timeTableType: type,
        courseName: curr.baseMetadata.courseName,
        courseCode: curr.baseMetadata.courseCode,
        courseId: curr.baseMetadata.courseId,
        class: curr.baseMetadata.class,
        section: curr.baseMetadata.section,
        classSectionsId: curr.baseMetadata.classSectionsId,
        startingDate: curr.baseMetadata.startingDate,
        endingDate: curr.baseMetadata.endingDate,
        sectionRoutine: []
      };
      finalOutput.push(record);
    }

    let dayObj = record.sectionRoutine.find(d => d.day === curr.day);
    if (!dayObj) {
      dayObj = { day: curr.day, period: [] };
      record.sectionRoutine.push(dayObj);
    }

    let existPeriod = dayObj.period.find(p => p.timeTableCreationId === curr.timeTableCreationId);

    if (!existPeriod) {
      dayObj.period.push({
        timeTableCreationId: curr.timeTableCreationId,
        periodName: curr.periodDetails?.periodName,
        isBreak: curr.periodDetails?.isBreak,
        periodLength: curr.periodDetails?.periodLength,
        periodGap: curr.periodDetails?.periodGap,
        startTime: curr.periodDetails?.startTime,
        endTime: curr.periodDetails?.endTime,
        mappingData: [curr.mappingEntry]
      });
    } else {
      existPeriod.mappingData.push(curr.mappingEntry);
    }

  });

  return { formatted: finalOutput };

};

export async function getTeacherSubject(employeeId, universityId, instituteId, role) {
  return await employeeRepository.getTeacherSubject(employeeId, universityId, instituteId, role)
};

export async function getSubjectEvalution(employeeId) {
  return await evaluationRepository.getTeacherSubjectEvalution(employeeId);
}


export async function getTodayClassSchedule(employeeId, currentDate, dayString, sessionId) {
  return await timeTableCreateRepository.getTodayClassScheduleForEmployee(employeeId, currentDate, dayString, sessionId);
}

export async function getTeacherCourses(employeeId, acedmicYearId) {
  return await employeeRepository.getTeacherCourses(employeeId, acedmicYearId);
}

export async function getTeacherSubjectsFromSchedule(employeeId, acedmicYearId) {
  return await employeeRepository.getTeacherSubjectsFromSchedule(employeeId, acedmicYearId);
}

export async function getPastClassSchedules(employeeId, acedmicYearId, currentDateString) {
  const rawSchedules = await timeTableCreateRepository.getPastClassSchedulesForEmployee(employeeId, acedmicYearId, currentDateString);

  const daysOfWeek = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };

  const limitDate = new Date(currentDateString);
  limitDate.setHours(0, 0, 0, 0);

  const pastClasses = [];

  for (const schedule of rawSchedules) {
    const routine = schedule.timeTablecreate;
    if (!routine || !routine.startingDate || !routine.endingDate) continue;

    const start = new Date(routine.startingDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(routine.endingDate);
    end.setHours(0, 0, 0, 0);

    const targetDay = daysOfWeek[schedule.day];
    if (targetDay === undefined) continue;

    let current = new Date(start);
    while (current.getDay() !== targetDay) {
      current.setDate(current.getDate() + 1);
    }

    while (current <= end && current < limitDate) {
      const classInstance = JSON.parse(JSON.stringify(schedule));
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');

      classInstance.date = `${year}-${month}-${day}`;
      pastClasses.push(classInstance);

      current.setDate(current.getDate() + 7);
    }
  }

  // Sort by date descending
  pastClasses.sort((a, b) => new Date(b.date) - new Date(a.date));

  return pastClasses;
}

export async function getUpcomingClassSchedules(employeeId, acedmicYearId, currentDateString) {
  const rawSchedules = await timeTableCreateRepository.getUpcomingClassSchedulesForEmployee(employeeId, acedmicYearId, currentDateString);

  const daysOfWeek = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };

  const limitDate = new Date(currentDateString);
  limitDate.setHours(0, 0, 0, 0);

  const upcomingClasses = [];

  for (const schedule of rawSchedules) {
    const routine = schedule.timeTablecreate;
    if (!routine || !routine.startingDate || !routine.endingDate) continue;

    const start = new Date(routine.startingDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(routine.endingDate);
    end.setHours(0, 0, 0, 0);

    const targetDay = daysOfWeek[schedule.day];
    if (targetDay === undefined) continue;

    let current = new Date(start);
    while (current.getDay() !== targetDay) {
      current.setDate(current.getDate() + 1);
    }

    while (current <= end) {
      if (current >= limitDate) {
        const classInstance = JSON.parse(JSON.stringify(schedule));
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');

        classInstance.date = `${year}-${month}-${day}`;
        upcomingClasses.push(classInstance);
      }
      current.setDate(current.getDate() + 7);
    }
  }

  // Sort by date ascending for upcoming classes
  upcomingClasses.sort((a, b) => new Date(a.date) - new Date(b.date));

  return upcomingClasses;
}

function extractSubjectDetails(schedule) {
  if (schedule.timeTableSubject) {
    return { subjectId: schedule.timeTableSubject.subjectId, subjectName: schedule.timeTableSubject.subjectName };
  } else if (schedule.timeTableElective) {
    return { subjectId: schedule.timeTableElective.electiveSubjectId, subjectName: schedule.timeTableElective.electiveSubjectName };
  }
  return null;
}

function processScheduleCombinations(schedules) {
  const uniqueCombinationsMap = new Map();

  for (const schedule of schedules) {
    if (!schedule.timeTablecreate || !schedule.timeTablecreate.timeTableClassSection) continue;

    const classSection = schedule.timeTablecreate.timeTableClassSection;
    const course = schedule.timeTablecreate.timeTableCourse;

    const subject = extractSubjectDetails(schedule);
    if (!subject) continue;

    const key = `${classSection.classSectionsId}_${subject.subjectId}`;
    if (!uniqueCombinationsMap.has(key)) {
      uniqueCombinationsMap.set(key, {
        courseId: course?.courseId,
        courseName: course?.courseName,
        classSectionsId: classSection.classSectionsId,
        class: classSection.class,
        section: classSection.section,
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        totalClasses: 0
      });
    }

    const entry = uniqueCombinationsMap.get(key);
    const startDateStr = schedule.timeTablecreate.startingDate;
    const endDateStr = schedule.timeTablecreate.endingDate;
    const dayStr = schedule.day;

    if (startDateStr && endDateStr && dayStr) {
      entry.totalClasses += countWeekdayInRange(startDateStr, endDateStr, dayStr);
    }
  }

  return Array.from(uniqueCombinationsMap.values());
}

function getEmployeeDetails(schedules) {
  return schedules.length > 0 && schedules[0].employeeDetails
    ? {
      employeeId: schedules[0].employeeDetails.employeeId,
      employeeName: schedules[0].employeeDetails.employeeName
    }
    : null;
}

export async function getUniqueClassSectionSubjects(employeeId, acedmicYearId) {
  const schedules = await timeTableCreateRepository.getUniqueClassSectionSubjectsForEmployee(employeeId, acedmicYearId);

  return {
    employeeDetails: getEmployeeDetails(schedules),
    combinations: processScheduleCombinations(schedules)
  };
}

export async function getClassCounts(employeeId, acedmicYearId, currentDateString) {
  const recurringSchedules = await timeTableCreateRepository.getEmployeeRecurringSchedules(employeeId, acedmicYearId);
  const allSchedules = await timeTableCreateRepository.getUniqueClassSectionSubjectsForEmployee(employeeId, acedmicYearId);

  const referenceDate = new Date(currentDateString);
  referenceDate.setHours(0, 0, 0, 0);

  let pastCount = 0;
  let upcomingCount = 0;

  for (const schedule of recurringSchedules) {
    const routine = schedule.timeTablecreate;
    if (!routine || !routine.startingDate || !routine.endingDate) continue;

    const start = new Date(routine.startingDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(routine.endingDate);
    end.setHours(0, 0, 0, 0);
    const dayName = schedule.day;

    if (start < referenceDate) {
      const pastEndLimit = new Date(referenceDate);
      pastEndLimit.setDate(pastEndLimit.getDate() - 1);
      const effectivePastEnd = end < pastEndLimit ? end : pastEndLimit;
      if (start <= effectivePastEnd) {
        pastCount += countWeekdayInRange(start, effectivePastEnd, dayName);
      }
    }

    if (end >= referenceDate) {
      const upcomingStartLimit = start > referenceDate ? start : referenceDate;
      if (upcomingStartLimit <= end) {
        upcomingCount += countWeekdayInRange(upcomingStartLimit, end, dayName);
      }
    }
  }

  const combinations = processScheduleCombinations(allSchedules);
  const uniqueSubjects = new Set(combinations.map(c => c.subjectId));

  return {
    pastCount,
    upcomingCount,
    uniqueSubjectsCount: uniqueSubjects.size
  };
}
