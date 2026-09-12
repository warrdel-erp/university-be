import sequelize from '../database/sequelizeConfig.js';
import * as model from '../models/index.js';
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
import * as employeeScheduleRepository from '../repository/employeeScheduleRepository.js';
import * as attendanceRepository from '../repository/attendanceRepository.js';
import * as classSectionTermRepository from '../repository/classSectionTermRepository.js';
import * as evaluationRepository from "../repository/evalutionRepository.js";
import { getSingleRoleDetails } from '../repository/roleRepository.js';
import { addHead } from '../repository/headRepository.js';
import { countWeekdayInRange, formatQueryDate, parseLocalDateOnly } from '../utility/helper.js';
import { resolveTimeTableRoutineSection } from '../utility/classSectionIncludes.js';
import { ROLES } from '../const/roles.js';
import moment from 'moment';
import { getTenantStore } from '../utility/requestContext.js';
import { decimalAdd } from '../utility/decimalMoney.js';
import { getDownloadSignedUrl } from '../utility/s3Helper.js';

async function generateEmployeeNumber(campusId, instituteId) {
  const getCampusCodeDetail = await getCampusCode(campusId);
  const getInstitueCodeDetail = await getInstituteCode(instituteId);
  const campusCode = getCampusCodeDetail.get('campusCode');
  const institueCode = getInstitueCodeDetail.get('instituteCode');
  const getPreviousEnrollNumber = await employeeRepository.getPreviousEnrollNumber(campusCode, institueCode);
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
      achievementCategory: row?.achievementCategory ?? row?.achievement_category ?? null,
      title: row?.title ?? row?.achievementName ?? null
    }))
    .filter((row) => Number.isInteger(Number(row?.achievementCategory)))
    .map((row) => ({
      ...row,
      achievementCategory: Number(row.achievementCategory)
    }));
}

function extractS3FileId(val) {
  if (val == null || val === "" || val === "null" || val === 0 || val === "0") return null;
  if (typeof val === "object") {
    if (val.id != null) return extractS3FileId(val.id);
    if (val.fileUploadId != null) return extractS3FileId(val.fileUploadId);
    return null;
  }
  const num = Number(val);
  return Number.isInteger(num) && num > 0 ? num : null;
}

async function linkEmployeeS3Files(fileIds = [], employeeId, companyId, transaction) {
  const validIds = [
    ...new Set(
      fileIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];
  if (validIds.length === 0) return;

  await model.s3FileModel.update(
    {
      status: "active",
      entityType: "employee_document",
      entityId: String(employeeId),
      ...(companyId ? { companyId: Number(companyId) } : {}),
    },
    {
      where: { id: validIds },
      transaction,
    }
  );
}

async function enrichS3FileRecord(fileRecord) {
  if (!fileRecord || typeof fileRecord !== "object") return fileRecord || null;
  const plain = toPlain(fileRecord);
  if (plain?.s3Key && !plain?.url) {
    try {
      plain.url = await getDownloadSignedUrl(plain.s3Key);
    } catch (err) {
      console.warn("Failed to generate download url for s3Key:", plain.s3Key, err.message);
    }
  }
  return plain;
}

function normalizeDocumentAttachments(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      ...row,
      document: row?.document ?? row?.documentType ?? null,
      attachment: extractS3FileId(row?.attachment)
    }))
    .filter((row) => Number.isInteger(Number(row?.document)));
}

function toPlain(value) {
  return typeof value?.toJSON === "function" ? value.toJSON() : value;
}

function mapRoleData(authUser = {}) {
  const userRolePermissions = authUser?.userRolePermissions || [];

  const firstRole = userRolePermissions.find(urp => urp?.userRole?.role)?.userRole?.role || "";

  const permissions = userRolePermissions.map(urp => urp?.permission).filter(Boolean);

  return {
    role: firstRole,
    permissions: [...new Set(permissions)]
  };
}

async function resolveOfficeEntry(item = {}) {
  const directOffice = await getEmployeeOfficeDetails(item?.userId);
  const directOfficeEntry = toPlain(directOffice) || {};
  const includedOffice = Array.isArray(item?.office) ? (item.office[0] || {}) : (item?.office || {});
  return Object.keys(directOfficeEntry).length > 0 ? directOfficeEntry : includedOffice;
}

function mapEmployment(item = {}, officeEntry = {}, addressEntry = {}) {
  const officialMail = officeEntry?.officialEmailId || officeEntry?.officalEmailId || officeEntry?.officeMailId || "";
  const officialMob = officeEntry?.officialMobileNumber || officeEntry?.officalMobileNumber || "";
  return {
    departmentId: item?.departmentId ?? null,
    departmentName: item?.employeeDepartment?.departmentName || "",
    employmentType: item?.employmentType || "",
    joiningDate: officeEntry?.joiningDate || "",
    noticePeriod: officeEntry?.noticePeriod ?? "",
    employeeFileNumber: officeEntry?.employeeFileNumber || "",
    officialEmailId: officialMail,
    officialMobileNumber: officialMob,
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

function safeParseJsonField(val, fallback = null) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export async function addEmployee(data, files, createdBy, roleId) {
  const { universityId, instituteId, campusId: contextCampusId } = getTenantStore();
  let campusId = contextCampusId;

  if (!campusId && instituteId) {
    const instRecord = await model.instituteModel.findByPk(instituteId, { attributes: ["campusId"] });
    if (instRecord) {
      campusId = instRecord.campusId ?? instRecord.get?.("campusId");
    }
  }

  data.instituteId = instituteId;
  data.campusId = campusId;

  const transaction = await sequelize.transaction();
  try {
    const address = safeParseJsonField(data.address, null);
    const corsAddress = safeParseJsonField(data.corsAddress, null);
    const office = safeParseJsonField(data.office, null) || {};
    const officialEmail = data.officialEmailId ?? office.officialEmailId ?? null;
    const officialMobile = data.officialMobileNumber ?? office.officialMobileNumber ?? null;
    const normalizedOffice = {
      ...office,
      employeeRank: office.employeeRank ?? data.salutation ?? data.designation ?? null,
      officialEmailId: officialEmail,
      officialMobileNumber: officialMobile,
    };

    const skills = safeParseJsonField(data.skill, []);
    const documents = safeParseJsonField(data.documents, []);
    const qualifications = safeParseJsonField(data.qualification, []);
    const experiences = safeParseJsonField(data.experience, []);
    const achievementsRaw = safeParseJsonField(data.achievements, []);
    const achievements = normalizeAchievements(achievementsRaw);
    const wards = safeParseJsonField(data.ward, []);
    const activitiesRaw = safeParseJsonField(data.activity, []);
    const activities = normalizeActivities(activitiesRaw);
    const references = safeParseJsonField(data.reference, []);
    const research = safeParseJsonField(data.research, []);
    const longLeavesRaw = safeParseJsonField(data.longLeave, []);
    const longLeaves = normalizeLongLeaves(longLeavesRaw);


    const employeePersonalDetail = {
      personalEmail: officialEmail || address?.personalEmail || null,
      mobileNumber: address?.mobileNumber || officialMobile || null,
    };

    const employeeRegisterData = {
      universityId,
      employeeName: data.employeeName,
      userId: null,
      instituteId,
      roleId: null,
      isTeacher: false,
    };

    const userId = await employeeRegister(employeePersonalDetail, employeeRegisterData, transaction);

    // Add employee
    data.createdBy = createdBy;
    data.userId = userId;
    data.roleId = null;
    data.employeePhoto = extractS3FileId(data.employeePhoto);
    data.employeeSignature = extractS3FileId(data.employeeSignature);
    data.employeeCode = await generateEmployeeNumber(data.campusId, data.instituteId);
    delete data.department;
    data.departmentId = data.departmentId ? Number(data.departmentId) : null;

    const employee = await employeeRepository.addEmployee(data, transaction);
    const employeeId = employee.dataValues.employeeId;

    // Associate user and employee
    await registerRepository.adminUser({ userId, employeeId }, transaction);

    const { campusId, employeeName } = employee.dataValues;

    // image / files upload and AWS S3 JSON URLs handling
    if (files && typeof files === 'object' && Object.keys(files).length > 0) {
      const uploadPromises = Object.keys(files).map(async key => {
        const file = files[key];
        const s3Response = await uploadFile(file);
        const url = s3Response.Location;
        const fileData = { key, url, userId, createdBy };
        await employeeFilesRepository.addEmployeeFiles(fileData, transaction);
      });

      await Promise.all(uploadPromises);
    }

    const jsonFiles = safeParseJsonField(data.files ?? data.employeeFiles, null);
    if (jsonFiles) {
      if (Array.isArray(jsonFiles)) {
        for (const fileItem of jsonFiles) {
          if (fileItem?.url) {
            await employeeFilesRepository.addEmployeeFiles({
              key: fileItem.key || fileItem.fieldName || "document",
              url: fileItem.url,
              userId,
              createdBy,
            }, transaction);
          }
        }
      } else if (typeof jsonFiles === 'object') {
        for (const [key, url] of Object.entries(jsonFiles)) {
          if (url) {
            await employeeFilesRepository.addEmployeeFiles({
              key,
              url: typeof url === 'string' ? url : url?.url,
              userId,
              createdBy,
            }, transaction);
          }
        }
      }
    }

    // Add employee address
    if (address) {
      await employeeAddressRepository.addAddress({
        userId,
        employeeId,
        createdBy,
        pAddress: address.pAddress || null,
        pPincode: address.pPincode || null,
        pCountry: address.pCountry || null,
        pState: address.pState || null,
        pCity: address.pCity || null,
        mobileNumber: address.mobileNumber || null,
        personalEmail: address.personalEmail || null,
      }, transaction);
    }

    // Add employee cor-address (employee_cor_address: address, pincode, cCity, cState, cCountry)
    if (corsAddress) {
      await employeeAddressRepository.addCorsAddress({
        userId,
        employeeId,
        createdBy,
        address: corsAddress.address ?? corsAddress.cAddress ?? null,
        pincode: corsAddress.pincode ?? corsAddress.cPincode ?? null,
        cCity: corsAddress.cCity || null,
        cState: corsAddress.cState || null,
        cCountry: corsAddress.cCountry || null,
      }, transaction);
    }

    // Add employee office details
    await employeeOfficeRepository.addOfficeDetails({
      userId,
      employeeId,
      createdBy,
      ...normalizedOffice,
    }, transaction);

    // Add employee skills
    for (const skill of skills) {
      await employeeSkillRepository.addEmployeeSkill({
        employeeId,
        userId,
        createdBy,
        ...skill,
        name: skill.name ?? skill.skill,
        proficiencyLevel: skill.proficiencyLevel ?? skill.proficiency,
      }, transaction);
    }

    // Add employee documents (frontend "documents" tab) -> employee_qualification table
    const validDocsForQualification = normalizeDocumentAttachments(documents || []).filter((doc) => doc?.receivedDate);
    for (const document of validDocsForQualification) {
      await employeeQualificationRepository.addEmployeeQualification({
        employeeId,
        userId,
        createdBy,
        ...document
      }, transaction);
    }

    // Link and activate S3 files for employeePhoto, employeeSignature, and document attachments
    const employeeS3FileIds = [
      data.employeePhoto,
      data.employeeSignature,
      ...validDocsForQualification.map((d) => d?.attachment)
    ].filter(Boolean);
    await linkEmployeeS3Files(employeeS3FileIds, employeeId, data.campusId || data.instituteId, transaction);

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
        userId,
        createdBy,
        ...qualification
      }, transaction);
    }

    // Add employee experiences
    for (const experience of experiences) {
      await employeeExperianceRepository.addEmployeeExperiance({
        employeeId,
        userId,
        createdBy,
        ...experience
      }, transaction);
    }

    // Add employee achievements
    for (const achievement of achievements) {
      await employeeAchivementRepository.addEmployeeAchievement({
        employeeId,
        userId,
        createdBy,
        ...achievement
      }, transaction);
    }

    // Add employee wards
    for (const ward of wards) {
      await employeeWardRepository.addEmployeeWard({
        employeeId,
        userId,
        createdBy,
        ...ward
      }, transaction);
    }

    // Add employee activities
    for (const activity of activities) {
      await employeeActivityRepository.addEmployeeActivity({
        employeeId,
        userId,
        createdBy,
        ...activity
      }, transaction);
    }

    // Add employee references
    for (const reference of references) {
      await employeeReferenceRepository.addEmployeeReference({
        employeeId,
        userId,
        createdBy,
        ...reference
      }, transaction);
    }

    // Add employee research
    for (const researchItem of research) {
      await employeeResearchRepository.addEmployeeResearch({
        employeeId,
        userId,
        createdBy,
        ...researchItem
      }, transaction);
    }

    // Add employee long leaves
    for (const longLeave of longLeaves) {
      await employeeLongLeaveRepository.addEmployeeLongLeave({
        employeeId,
        userId,
        createdBy,
        ...longLeave
      }, transaction);
    }

    //  allDropDownData
    if (data.allDropDownData) {
      const allDropDownDataObject = safeParseJsonField(data.allDropDownData, null);

      if (typeof allDropDownDataObject === 'object' && allDropDownDataObject !== null && Array.isArray(allDropDownDataObject.type) && Array.isArray(allDropDownDataObject.code)) {
        const type = allDropDownDataObject.type;
        const code = allDropDownDataObject.code;

        if (type.length !== code.length) {
          throw new Error('Types and codes arrays must be of the same length.');
        }

        const entries = type.map((types, index) => ({
          userId,
          createdBy,
          types,
          codes: code[index]
        }));

        await employeeMetaDataRepository.employeeMetaData(entries, transaction);
      } else {
        throw new Error('Invalid format for allDropDownData.');
      }
    }


    if (data.isAdmin === true) {
      const headData = { campusId, instituteId, universityId, createdBy, updatedBy: createdBy, headName: employeeName, mobileNumber: mobileNumber || officialMobile, alternateNumber: officialMobile || mobileNumber, registerEmail: officialEmail || personalEmail, alternateEmail: personalEmail, isAdmin: true, designation: 'Admin' };
      await addHead(headData, transaction);
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

export async function updateEmployee(identifier, data, files, updatedBy, createdBy) {

  const transaction = await sequelize.transaction();
  try {
    const existingEmployee = await employeeRepository.assertScopedEmployee(identifier, { transaction });
    if (!existingEmployee) {
      throw new Error(`Employee not found for id: ${identifier}`);
    }
    const employeeId = existingEmployee.employeeId;
    const userId = existingEmployee.userId;

    const address = safeParseJsonField(data.address, null);
    const corsAddress = safeParseJsonField(data.corsAddress, null);
    const office = safeParseJsonField(data.office, null);
    const officialEmail = data.officialEmailId ?? office?.officialEmailId;
    const officialMobile = data.officialMobileNumber ?? office?.officialMobileNumber;
    const normalizedOffice = (office || officialEmail !== undefined || officialMobile !== undefined) ? {
      ...(office || {}),
      employeeRank: office?.employeeRank ?? data.salutation ?? data.designation ?? null,
      ...(officialEmail !== undefined ? { officialEmailId: officialEmail } : {}),
      ...(officialMobile !== undefined ? { officialMobileNumber: officialMobile } : {}),
    } : null;


    // array
    const skills = safeParseJsonField(data.skill, []);
    const documents = safeParseJsonField(data.documents, []);
    const qualifications = safeParseJsonField(data.qualification, []);
    const experiences = safeParseJsonField(data.experience, []);
    const achievementsRaw = safeParseJsonField(data.achievements, []);
    const achievements = normalizeAchievements(achievementsRaw);
    const wards = safeParseJsonField(data.ward, []);
    const activitiesRaw = safeParseJsonField(data.activity, []);
    const activities = normalizeActivities(activitiesRaw);
    const references = safeParseJsonField(data.reference, []);
    const research = safeParseJsonField(data.research, []);
    const longLeavesRaw = safeParseJsonField(data.longLeave, []);
    const longLeaves = normalizeLongLeaves(longLeavesRaw);
    const allDropDownData = safeParseJsonField(data.allDropDownData, { type: [], code: [] });

    //  Update main employee table
    const {
      roleId: _excludedRoleId,
      campusId: _excludedCampusId,
      instituteId: _excludedInstituteId,
      department: _legacyDepartment,
      ...employeeUpdateData
    } = data;
    if (employeeUpdateData.employeePhoto !== undefined) {
      employeeUpdateData.employeePhoto = extractS3FileId(employeeUpdateData.employeePhoto);
    }
    if (employeeUpdateData.employeeSignature !== undefined) {
      employeeUpdateData.employeeSignature = extractS3FileId(employeeUpdateData.employeeSignature);
    }
    if (employeeUpdateData.departmentId !== undefined) {
      employeeUpdateData.departmentId = employeeUpdateData.departmentId ? Number(employeeUpdateData.departmentId) : null;
    }
    await employeeRepository.updateEmployee(employeeId, {
      ...employeeUpdateData,
      roleId: null,  // role_id in employee table is always null; role is managed via user_roles table
      updatedBy
    }, transaction);

    // Sync officialEmailId with user table email
    const updatedEmail = data.officialEmailId ?? office?.officialEmailId;
    if (updatedEmail && userId) {
      await registerRepository.updateUser(userId, { email: updatedEmail }, transaction);
    }

    //  Upload/update files (supports both binary uploads and AWS S3 JSON URLs)
    if (files && typeof files === 'object' && Object.keys(files).length > 0) {
      const uploadPromises = Object.keys(files).map(async key => {
        const file = files[key];
        const s3Response = await uploadFile(file);
        const url = s3Response.Location;
        const fileData = { key, url, employeeId, userId, updatedBy };
        await employeeFilesRepository.updateEmployee(employeeId, fileData, transaction);
      });
      await Promise.all(uploadPromises);
    }

    const jsonFiles = safeParseJsonField(data.files ?? data.employeeFiles, null);
    if (jsonFiles) {
      if (Array.isArray(jsonFiles)) {
        for (const fileItem of jsonFiles) {
          if (fileItem?.url) {
            await employeeFilesRepository.updateEmployee(employeeId, {
              key: fileItem.key || fileItem.fieldName || "document",
              url: fileItem.url,
              employeeId,
              userId,
              updatedBy,
            }, transaction);
          }
        }
      } else if (typeof jsonFiles === 'object') {
        for (const [key, url] of Object.entries(jsonFiles)) {
          if (url) {
            await employeeFilesRepository.updateEmployee(employeeId, {
              key,
              url: typeof url === 'string' ? url : url?.url,
              employeeId,
              userId,
              updatedBy,
            }, transaction);
          }
        }
      }
    }

    //  Update Address
    if (address) {
      const addressPayload = {
        updatedBy,
        pAddress: address.pAddress || null,
        pPincode: address.pPincode || null,
        pCountry: address.pCountry || null,
        pState: address.pState || null,
        pCity: address.pCity || null,
        mobileNumber: address.mobileNumber || null,
        personalEmail: address.personalEmail || null,
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
          userId,
          createdBy,
          ...addressPayload,
        }, transaction);
      }
    }

    if (corsAddress) {
      const corsAddressPayload = {
        updatedBy,
        address: corsAddress.address ?? corsAddress.cAddress ?? null,
        pincode: corsAddress.pincode ?? corsAddress.cPincode ?? null,
        cCity: corsAddress.cCity || null,
        cState: corsAddress.cState || null,
        cCountry: corsAddress.cCountry || null,
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
          userId,
          createdBy,
          ...corsAddressPayload,
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
          userId,
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

    // Link and activate S3 files for employeePhoto, employeeSignature, and document attachments
    const employeeUpdateS3FileIds = [
      employeeUpdateData.employeePhoto,
      employeeUpdateData.employeeSignature,
      ...(hasDocumentsField ? validDocsForQualification.map((d) => d?.attachment) : []),
    ].filter(Boolean);
    await linkEmployeeS3Files(employeeUpdateS3FileIds, employeeId, data.campusId || data.instituteId, transaction);

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
      const allDropDownDataObject = safeParseJsonField(data.allDropDownData, null);

      if (allDropDownDataObject && Array.isArray(allDropDownDataObject.type) && Array.isArray(allDropDownDataObject.code)) {
        const type = allDropDownDataObject.type;
        const code = allDropDownDataObject.code;

        const entries = type.map((types, index) => ({
          employeeId,
          userId,
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
// addEmployee(data,1)

function isTeacherRole(role) {
  return String(role ?? '').toUpperCase() === ROLES.TEACHER;
}

function formatTeacherSubjectMappings(rows) {
  return (rows || []).map((row) => {
    const plain = toPlain(row) || {};
    const subject = plain.employeeSubject || {};
    const course = subject.courseInfo || {};
    return {
      teacherSubjectMappingId: plain.teacherSubjectMappingId,
      subjectId: plain.subjectId ?? subject.subjectId,
      subjectName: subject.subjectName ?? null,
      subjectCode: subject.subjectCode ?? null,
      subjectType: subject.subjectType ?? null,
      subjectCategory: subject.subjectCategory ?? null,
      courseId: subject.courseId ?? null,
      courseName: course.courseName ?? null,
      courseCode: course.courseCode ?? null,
    };
  });
}

async function formatEmployeeListItem(row) {
  const item = toPlain(row) || {};
  const authUser = item?.user || item?.userEmployee || {};
  const mappedRoleData = mapRoleData(authUser);
  const officeEntry = Array.isArray(item?.office) ? (item.office[0] || {}) : (item?.office || {});
  const addressEntry = Array.isArray(item?.address) ? (item.address[0] || {}) : (item?.address || {});
  const employment = mapEmployment(item, officeEntry, addressEntry);

  const photoFile = await enrichS3FileRecord(item?.photoFile);
  const signatureFile = await enrichS3FileRecord(item?.signatureFile);

  return {
    ...item,
    photoFile,
    signatureFile,
    employeePhotoUrl: photoFile?.url || null,
    employeeSignatureUrl: signatureFile?.url || null,
    departmentName: item?.employeeDepartment?.departmentName || "",
    roleId: item?.roleId || mappedRoleData?.role || "",
    roleData: mappedRoleData,
    role: mappedRoleData?.role ? [mappedRoleData.role] : (item?.role || []),
    joiningDate: employment.joiningDate,
    gender: getMetaCode(item, "gender"),
    religion: getMetaCode(item, "religion"),
    nationality: getMetaCode(item, "nationality"),
    employment,
  };
}

export async function getAllEmployee(campusId, instituteId, auth = {}) {
  const { userId, role, employeeId: authEmployeeId } = auth;

  if (isTeacherRole(role)) {
    const resolvedEmployeeId = await employeeRepository.resolveEmployeeIdForAuth({
      userId,
      employeeId: authEmployeeId,
    });
    if (!resolvedEmployeeId) {
      throw new Error('Employee not found for user');
    }

    const [employees, subjectMappings] = await Promise.all([
      employeeRepository.getAllEmployee(undefined, undefined, { employeeId: resolvedEmployeeId }),
      employeeRepository.getTeacherSubject(resolvedEmployeeId, {}),
    ]);

    const formatted = await Promise.all((employees || []).map(formatEmployeeListItem));
    if (!formatted.length) {
      return [];
    }

    return [{
      ...formatted[0],
      subjects: formatTeacherSubjectMappings(subjectMappings),
    }];
  }

  const result = await employeeRepository.getAllEmployee(campusId, instituteId);
  return Promise.all((result || []).map(formatEmployeeListItem));
};

export async function getSingleEmployeeDetails(userId) {
  const result = await employeeRepository.getSingleEmployeeDetails(userId);
  return Promise.all((result || []).map(async (row) => {
    const item = toPlain(row) || {};
    const authUser = item?.user || item?.userEmployee || {};
    const mappedRoleData = mapRoleData(authUser);

    const officeEntry = Array.isArray(item?.office) ? (item.office[0] || {}) : (item?.office || {});
    const addressEntry = Array.isArray(item?.address) ? (item.address[0] || {}) : (item?.address || {});
    const employment = mapEmployment(item, officeEntry, addressEntry);

    const photoFile = await enrichS3FileRecord(item?.photoFile);
    const signatureFile = await enrichS3FileRecord(item?.signatureFile);

    const rawDocuments = Array.isArray(item?.documents) ? item.documents : [];
    const documents = await Promise.all(
      rawDocuments.map(async (doc) => {
        const docPlain = toPlain(doc) || {};
        if (docPlain.attachmentFile) {
          docPlain.attachmentFile = await enrichS3FileRecord(docPlain.attachmentFile);
          docPlain.attachmentUrl = docPlain.attachmentFile?.url || null;
        }
        return docPlain;
      })
    );

    return {
      ...item,
      photoFile,
      signatureFile,
      employeePhotoUrl: photoFile?.url || null,
      employeeSignatureUrl: signatureFile?.url || null,
      documents,
      userEmployee: authUser,
      roleData: mappedRoleData,
      roleId: item?.roleId || mappedRoleData?.role || "",
      role: mappedRoleData?.role ? [mappedRoleData.role] : (item?.role || []),
      employment,
      salutation: officeEntry?.employeeRank || item?.salutation || "",
      designation: officeEntry?.employeeRank || item?.designation || "",
      experience: item?.experiance || item?.experience || [],
      activity: mapActivityForEmployeeDetails(item?.activty || item?.activity || []),
      longLeave: mapLongLeaveForEmployeeDetails(item?.longLeave || []),
    };
  }));
};

export async function deleteEmployeeDetail(userId) {
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
      employeeRepository.deleteEmployeeDetail(userId),
      employeeAddressRepository.deleteEmployeeAddress(userId),
      employeeOfficeRepository.deleteEmployeeOffice(userId),
      employeeRoleRepository.deleteEmployeeRole(userId),
      employeeSkillRepository.deleteEmployeeSkill(userId),
      employeeDocumentRepository.deleteEmployeeDocuments(userId),
      employeeQualificationRepository.deleteEmployeeQualification(userId),
      employeeExperianceRepository.deleteEmployeeExperiance(userId),
      employeeAchivementRepository.deleteEmployeeAchievement(userId),
      employeeWardRepository.deleteEmployeeWard(userId),
      employeeActivityRepository.deleteEmployeeActivity(userId),
      employeeReferenceRepository.deleteEmployeeReference(userId),
      employeeLongLeaveRepository.deleteEmployeeLongLeave(userId),
      employeeMetaDataRepository.deleteEmployeeMetaData(userId)
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
    if (error.statusCode) {
      throw error;
    }
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
    "createdBy",
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
  const { universityId } = getTenantStore();

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
        departmentId: (convertedData.departmentId != null && convertedData.departmentId !== "" && convertedData.departmentId !== 0) ? Number(convertedData.departmentId) : null,
        motherName: convertedData.motherName,
        pickColor: convertedData.pickColor,
        campusId: convertedData.campusId,
        instituteId: convertedData.instituteId,
        roleId: convertedData.roleId,
        createdBy: convertedData.createdBy,
      };

      const officeData = {
        joiningDate: convertedData.joiningDate,
        confirmationDate: convertedData.confirmationDate,
        relievingDate: convertedData.relievingDate,
        retirementDate: convertedData.retirementDate,
        employeeFileNumber: convertedData.employeeFileNumber,
        noticePeriod: convertedData.noticePeriod,
        officialEmailId: convertedData.officialEmailId || null,
        officialMobileNumber: convertedData.officialMobileNumber || null,
        createdBy: convertedData.createdBy,
      };

      const addressData = {
        pAddress: convertedData.pAddress,
        pPincode: convertedData.pPincode,
        mobileNumber: convertedData.mobileNumber || convertedData.phoneNumber || null,
        personalEmail: convertedData.personalEmail || null,
        createdBy: convertedData.createdBy,
      };


      const result = await employeeRepository.createEmployeeWithDetails(employeeData, officeData, addressData, transaction);
      const employeeId = result.dataValues.employeeId

      const employeeRegisterData = {
        instituteId: convertedData.instituteId,
        roleId: null,
        isTeacher: false,
        employeeName: convertedData.employeeName,
        universityId,
        employeeId
      }
      const employeePersonalDetail = {
        personalEmail: convertedData.officialEmailId || convertedData.officalEmailId,
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


export async function getEmployeeOfficeDetails(userId) {
  return await employeeOfficeRepository.getEmployeeOfficeByEmployeeId(userId);
}

export async function getEmployeeReferenceDetails(userId) {
  return await employeeReferenceRepository.getEmployeeReferencesByEmployeeId(userId);
}

export async function getEmployeeSkillDetails(userId) {
  return await employeeSkillRepository.getEmployeeSkillsByEmployeeId(userId);
}

export async function getEmployeeDocumentDetails(userId) {
  return await employeeDocumentRepository.getEmployeeDocumentsByEmployeeId(userId);
}

export async function getEmployeeQualificationDetails(userId) {
  return await employeeQualificationRepository.getEmployeeQualificationsByEmployeeId(userId);
}

export async function getEmployeeExperienceDetails(userId) {
  return await employeeExperianceRepository.getEmployeeExperiencesByEmployeeId(userId);
}

export async function getEmployeeAchievementDetails(userId) {
  return await employeeAchivementRepository.getEmployeeAchievementsByEmployeeId(userId);
}

export async function getEmployeeResearchList(userId) {
  return await employeeResearchRepository.getEmployeeResearchByEmployeeId(userId);
}

export async function getEmployeeActivityDetails(userId) {
  return await employeeActivityRepository.getEmployeeActivitiesByEmployeeId(userId);
}

export async function getEmployeeLongLeaveDetails(userId) {
  return await employeeLongLeaveRepository.getEmployeeLongLeavesByEmployeeId(userId);
}

export async function getBooksIssuedToEmployee(userId) {
  const rawData = await libraryRepository.getBooksIssuedToEmployee(userId);
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

export async function getTeacherTimeTable(userId) {
  const allData = await employeeScheduleRepository.getTeacherWeekCells(userId);

  const allMappings = [];

  for (const item of allData) {
    const plain = item.get({ plain: true });
    const course = plain.timeTableCourse || {};
    const classSection = plain.timeTableClassSectionTerm?.classSection
      || plain.timeTableClassSection
      || {};

    for (const period of plain.timeTableCells) {
      const {
        day,
        timeTableCellId,
        isSameTeacher,
        timeTableCreationId,
        timeTableType,
        timeTablecreation,
        timeTableSubject,
        timeTableTeacherSubject,
        timeTableElective,
        timeTableCellTeachers,
      } = period;

      const teacherRow = timeTableCellTeachers[0];
      const employeeDetails = teacherRow.employeeDetails;
      const sameTeacher = isSameTeacher;

      const subjectData = sameTeacher
        ? timeTableTeacherSubject?.employeeSubject
        : timeTableSubject;

      const teacherData = sameTeacher
        ? timeTableTeacherSubject?.teacherEmployeeData
        : employeeDetails;

      const mappingEntry = {
        timeTableCellId,
        userId: teacherData?.userId,
        employeeName: teacherData?.employeeName,
        employeeCode: teacherData?.employeeCode,
        pickColor: teacherData?.pickColor,
        timeTableType,
        subject: timeTableElective
          ? {
            subjectId: timeTableElective.electiveSubjectId,
            Name: timeTableElective.electiveSubjectName,
            Code: timeTableElective.electiveSubjectCode,
          }
          : {
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
          courseId: plain.courseId || course.courseId,
          class: classSection.year != null ? String(classSection.year) : '',
          section: classSection.section,
          classSectionsId: plain.classSectionsId || classSection.classSectionsId,
          startingDate: plain.startingDate,
          endingDate: plain.endingDate,
          timeTableType,
        },
      });
    }
  }

  const finalOutput = [];

  for (const curr of allMappings) {
    const type = curr.mappingEntry.timeTableType;

    let record = null;
    for (const row of finalOutput) {
      if (row.timeTableType === type) {
        record = row;
        break;
      }
    }

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
        sectionRoutine: [],
      };
      finalOutput.push(record);
    }

    let dayObj = null;
    for (const dayRow of record.sectionRoutine) {
      if (dayRow.day === curr.day) {
        dayObj = dayRow;
        break;
      }
    }
    if (!dayObj) {
      dayObj = { day: curr.day, period: [] };
      record.sectionRoutine.push(dayObj);
    }

    let existPeriod = null;
    for (const periodRow of dayObj.period) {
      if (periodRow.timeTableCreationId === curr.timeTableCreationId) {
        existPeriod = periodRow;
        break;
      }
    }

    if (!existPeriod) {
      dayObj.period.push({
        timeTableCreationId: curr.timeTableCreationId,
        periodName: curr.periodDetails?.periodName,
        isBreak: curr.periodDetails?.isBreak,
        periodLength: curr.periodDetails?.periodLength,
        periodGap: curr.periodDetails?.periodGap,
        startTime: curr.periodDetails?.startTime,
        endTime: curr.periodDetails?.endTime,
        mappingData: [curr.mappingEntry],
      });
    } else {
      existPeriod.mappingData.push(curr.mappingEntry);
    }
  }

  return { formatted: finalOutput };
}

export async function getTeacherSubject(userId, filters = {}) {
  return await employeeRepository.getTeacherSubject(userId, filters);
};

export async function getSubjectEvalution(userId) {
  return await evaluationRepository.getTeacherSubjectEvalution(userId);
}


const SCHEDULE_DAY_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function expandScheduleForExactDate(rawSchedules, currentDate) {
  const targetDate = parseLocalDateOnly(currentDate);
  const dateString = typeof currentDate === 'string' ? currentDate.split('T')[0] : formatQueryDate(currentDate);
  const results = [];

  for (const schedule of rawSchedules) {
    const routine = schedule.timeTablecreate;
    if (!routine?.startingDate || !routine?.endingDate) continue;

    const start = parseLocalDateOnly(routine.startingDate);
    const end = parseLocalDateOnly(routine.endingDate);
    if (targetDate < start || targetDate > end) continue;

    const targetDay = SCHEDULE_DAY_INDEX[schedule.day];
    if (targetDay === undefined || targetDate.getDay() !== targetDay) continue;

    results.push({
      ...JSON.parse(JSON.stringify(schedule)),
      date: dateString,
    });
  }

  results.sort((a, b) => (a.period || 0) - (b.period || 0));
  return results;
}

export async function getTodayClassSchedule(userId, currentDate, sessionId, groupPeriods = false, pagination = {}) {
  // When grouping, fetch extra rows since consecutive periods get merged
  const adjustedPagination = groupPeriods && pagination.limit
    ? { ...pagination, limit: pagination.limit * 2 }
    : pagination;

  const { rows: rawSchedules, total } = await employeeScheduleRepository.getTodayClassScheduleForEmployee(
    Number(userId),
    currentDate,
    sessionId,
    adjustedPagination,
  );

  const strippedSchedules = rawSchedules.map(stripTeacherFieldsFromSchedule);
  const schedules = await enrichTodayClassSchedules(strippedSchedules);

  if (groupPeriods) {
    const grouped = await groupConsecutivePeriods(schedules, groupPeriods === 'sessional');
    const limitedGroups = pagination.limit ? grouped.slice(0, pagination.limit) : grouped;
    return { schedules: await applyGroupAttendanceStatus(limitedGroups), total };
  }

  return { schedules, total };
}

export async function getTeacherCourses(userId) {
  return await employeeRepository.getTeacherCourses(userId);
}

export async function getTeacherSubjectsFromSchedule(userId, filters = {}) {
  return await employeeScheduleRepository.getTeacherSubjectsFromWeekCells(userId, filters);
}

function getTeacherDetails(rawSchedules) {
  const employee = rawSchedules.find((schedule) => schedule.employeeDetails)?.employeeDetails;

  if (!employee) {
    return null;
  }

  return {
    userId: employee.userId,
    employeeName: employee.employeeName,
    employeeCode: employee.employeeCode,
    pickColor: employee.pickColor,
  };
}

function stripTeacherFieldsFromSchedule(schedule) {
  if (!schedule) {
    return schedule;
  }

  const cleaned = { ...schedule };
  delete cleaned.employeeDetails;
  delete cleaned.teacher;

  if (cleaned.timeTableTeacherSubject) {
    cleaned.timeTableTeacherSubject = { ...cleaned.timeTableTeacherSubject };
    delete cleaned.timeTableTeacherSubject.teacherEmployeeData;
  }

  if (Array.isArray(cleaned.classScheduleItems)) {
    const cleanedItems = [];
    for (const item of cleaned.classScheduleItems) {
      cleanedItems.push(stripTeacherFieldsFromSchedule(item));
    }
    cleaned.classScheduleItems = cleanedItems;
  }

  return cleaned;
}

function getAttendanceStatusKey(schedule) {
  return `dw:${Number(schedule.timeTableCellDateWiseId)}`;
}

function resolveScheduleClassSectionTermId(schedule) {
  const routine = schedule.timeTablecreate || schedule.timeTableRoutine;
  if (!routine) {
    return null;
  }

  const routinePlain = routine.get ? routine.get({ plain: true }) : routine;
  if (routinePlain.classSectionTermId) {
    return routinePlain.classSectionTermId;
  }

  const classSectionTerm = routinePlain.timeTableClassSectionTerm;
  if (classSectionTerm && classSectionTerm.classSectionTermId) {
    return classSectionTerm.classSectionTermId;
  }

  return null;
}

function collectScheduleQueryParams(schedules) {
  const dateWiseIdSet = new Set();
  const dates = [];
  const resolvedTermIds = [];
  const uniqueTermIds = [];
  const seenTermIds = new Set();

  for (const schedule of schedules) {
    if (schedule.timeTableCellDateWiseId != null) {
      dateWiseIdSet.add(Number(schedule.timeTableCellDateWiseId));
    }
    if (schedule.date) {
      dates.push(schedule.date);
    }

    const classSectionTermId = resolveScheduleClassSectionTermId(schedule);
    resolvedTermIds.push(classSectionTermId);

    if (classSectionTermId) {
      const numericId = Number(classSectionTermId);
      if (!seenTermIds.has(numericId)) {
        seenTermIds.add(numericId);
        uniqueTermIds.push(numericId);
      }
    }
  }

  const dateWiseIds = [];
  for (const id of dateWiseIdSet) {
    dateWiseIds.push(id);
  }

  let from = '';
  let to = '';
  if (dates.length) {
    from = dates[0];
    to = dates[0];
    for (const date of dates) {
      if (date < from) {
        from = date;
      }
      if (date > to) {
        to = date;
      }
    }
  }

  return { dateWiseIds, from, to, resolvedTermIds, uniqueTermIds };
}

/**
 * MARKED / PENDING is keyed only by timeTableCellDateWiseId.
 * Shared across Primary / Secondary teachers on the same dated period.
 */
function resolveScheduleAttendanceFields(schedule, presentMap, markedMap) {
  const key = getAttendanceStatusKey(schedule);
  const presentCount = presentMap[key];
  const markedCount = markedMap[key];

  return {
    attendanceCount: presentCount != null ? presentCount : 0,
    attendanceStatus: markedCount > 0 ? 'MARKED' : 'PENDING',
  };
}

async function fetchElectiveStudentCountMap(schedules) {
  const electiveSubjectIds = [
    ...new Set(
      schedules
        .map((s) => s.electiveSubjectId || s.timeTableElective?.electiveSubjectId)
        .filter(Boolean)
        .map(Number)
    ),
  ];
  const electiveCountMap = new Map();
  if (electiveSubjectIds.length > 0) {
    const counts = await model.studentElectiveSubjectModel.findAll({
      where: { electiveSubjectId: electiveSubjectIds },
      attributes: ['electiveSubjectId', [sequelize.fn('COUNT', sequelize.col('student_id')), 'count']],
      group: ['electiveSubjectId'],
      raw: true,
    });
    for (const c of counts) {
      electiveCountMap.set(Number(c.electiveSubjectId), Number(c.count));
    }
  }
  return electiveCountMap;
}

async function enrichTodayClassSchedules(schedules) {
  if (!schedules.length) {
    return schedules;
  }

  const { dateWiseIds, resolvedTermIds, uniqueTermIds } =
    collectScheduleQueryParams(schedules);

  const [studentCountMap, electiveCountMap, markedMap, presentMap] = await Promise.all([
    classSectionTermRepository.countStudentsByClassSectionTermIds(uniqueTermIds),
    fetchElectiveStudentCountMap(schedules),
    attendanceRepository.getAttendanceMarkedMap({ dateWiseIds }),
    attendanceRepository.getAttendanceMap({ dateWiseIds }),
  ]);

  const enriched = [];
  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
    const classSectionTermId = resolvedTermIds[i];
    const attendanceFields = resolveScheduleAttendanceFields(schedule, presentMap, markedMap);
    const electiveId = schedule.electiveSubjectId || schedule.timeTableElective?.electiveSubjectId;

    let studentCount = 0;
    if (schedule.academicGroupId && schedule.academicGroupStudentCount != null) {
      studentCount = schedule.academicGroupStudentCount;
    } else if (electiveId) {
      studentCount = electiveCountMap.get(Number(electiveId)) || 0;
    } else if (classSectionTermId) {
      const count = studentCountMap.get(Number(classSectionTermId));
      if (count != null) {
        studentCount = count;
      }
    }

    enriched.push({
      ...schedule,
      studentCount,
      ...attendanceFields,
    });
  }

  return enriched;
}

async function enrichSchedulesWithAttendance(schedules) {
  if (!schedules.length) {
    return schedules;
  }

  const { dateWiseIds, resolvedTermIds, uniqueTermIds } = collectScheduleQueryParams(schedules);
  if (!dateWiseIds.length) {
    return schedules;
  }

  const [studentCountMap, electiveCountMap, markedMap, presentMap] = await Promise.all([
    classSectionTermRepository.countStudentsByClassSectionTermIds(uniqueTermIds),
    fetchElectiveStudentCountMap(schedules),
    attendanceRepository.getAttendanceMarkedMap({ dateWiseIds }),
    attendanceRepository.getAttendanceMap({ dateWiseIds }),
  ]);

  const enriched = [];
  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
    const classSectionTermId = resolvedTermIds[i];
    const attendanceFields = resolveScheduleAttendanceFields(schedule, presentMap, markedMap);
    const electiveId = schedule.electiveSubjectId || schedule.timeTableElective?.electiveSubjectId;

    let studentCount = 0;
    if (schedule.academicGroupId && schedule.academicGroupStudentCount != null) {
      studentCount = schedule.academicGroupStudentCount;
    } else if (electiveId) {
      studentCount = electiveCountMap.get(Number(electiveId)) || 0;
    } else if (classSectionTermId) {
      const count = studentCountMap.get(Number(classSectionTermId));
      if (count != null) {
        studentCount = count;
      }
    }

    enriched.push({
      ...schedule,
      studentCount,
      ...attendanceFields,
    });
  }

  return enriched;
}

async function applyGroupAttendanceStatus(groups) {
  for (const group of groups) {
    const items = group.classScheduleItems;
    let allMarked = items.length > 0;
    let anyMarked = false;

    for (const item of items) {
      if (item.attendanceStatus !== 'MARKED') {
        allMarked = false;
      }
      if (item.attendanceStatus === 'MARKED') {
        anyMarked = true;
      }
    }

    if (allMarked) {
      group.attendanceStatus = 'MARKED';
    } else if (anyMarked) {
      group.attendanceStatus = 'PARTIAL';
    } else {
      group.attendanceStatus = 'PENDING';
    }

    delete group.attendanceCount;
  }

  return groups;
}

/**
 * Past teacher schedule: expands recurring weekly mappings into dated occurrences
 * strictly before currentDateString, enriches attendance, optionally groups periods.
 *
 * @param {number|string} userOd
 * @param {number} academicYearId
 * @param {string} currentDateString - YYYY-MM-DD cutoff (dates before this only)
 * @param {false|'consecutive'|'sessional'} groupPeriods
 * @param {number} [sessionId] - when set, only routines for that session
 * @returns {Promise<{ teacher: object|null, schedules: object[] }>}
 */
export async function getPastClassSchedules(
  userId,
  academicYearId,
  currentDateString,
  groupPeriods = false,
  sessionId,
  pagination = {},
) {
  // When grouping, fetch extra rows since consecutive periods get merged
  const adjustedPagination = groupPeriods && pagination.limit
    ? { ...pagination, limit: pagination.limit * 2 }
    : pagination;

  const { rows: rawSchedules, total } = await employeeScheduleRepository.getPastClassSchedulesForEmployee(
    userId,
    academicYearId,
    currentDateString,
    sessionId,
    adjustedPagination,
  );

  const teacher = getTeacherDetails(rawSchedules);
  const schedules = await enrichSchedulesWithAttendance(
    rawSchedules.map(stripTeacherFieldsFromSchedule),
  );

  if (groupPeriods) {
    const grouped = await groupConsecutivePeriods(schedules, groupPeriods === 'sessional');
    grouped.sort((a, b) => new Date(b.date) - new Date(a.date));
    const limitedGroups = pagination.limit ? grouped.slice(0, pagination.limit) : grouped;
    return {
      teacher,
      schedules: await applyGroupAttendanceStatus(limitedGroups),
      total,
    };
  }

  return { teacher, schedules, total };
}

export async function getUpcomingClassSchedules(userId, academicYearId, currentDateString, groupPeriods = false, pagination = {}) {
  // When grouping, fetch extra rows since consecutive periods get merged
  const adjustedPagination = groupPeriods && pagination.limit
    ? { ...pagination, limit: pagination.limit * 2 }
    : pagination;

  const { rows: upcomingClasses, total } = await employeeScheduleRepository.getUpcomingClassSchedulesForEmployee(
    userId,
    academicYearId,
    currentDateString,
    adjustedPagination,
  );

  const strippedSchedules = upcomingClasses.map(stripTeacherFieldsFromSchedule);
  const schedules = await enrichSchedulesWithAttendance(strippedSchedules);

  if (groupPeriods) {
    const grouped = await groupConsecutivePeriods(schedules, groupPeriods === 'sessional');
    grouped.sort((a, b) => new Date(a.date) - new Date(b.date));
    const limitedGroups = pagination.limit ? grouped.slice(0, pagination.limit) : grouped;
    return { schedules: await applyGroupAttendanceStatus(limitedGroups), total };
  }

  return { schedules, total };
}

async function groupConsecutivePeriods(classes, sessionalBreak = false) {
  if (!classes.length) return [];

  // Grouping should preserve date sort order (already sorted in main functions)
  // We need to group within each date.

  const groupedResult = [];

  let breakPeriodsMap = new Map();
  const structureIds = [...new Set(classes.map(c => c.timeTableNameId).filter(Boolean))];
  if (structureIds.length > 0) {
    const allPeriods = await timeTableCreateRepository.getPeriodsForStructures(structureIds);
    // Create a map to quickly look up periods for each structure
    for (const p of allPeriods) {
      if (!breakPeriodsMap.has(p.timeTableNameId)) {
        breakPeriodsMap.set(p.timeTableNameId, []);
      }
      breakPeriodsMap.get(p.timeTableNameId).push(p);
    }
  }

  const getSubjectInfo = (item) => {
    if (item.timeTableSubject) return { id: item.timeTableSubject.subjectId, name: item.timeTableSubject.subjectName };
    if (item.timeTableElective) return { id: item.timeTableElective.electiveSubjectId, name: item.timeTableElective.electiveSubjectName };
    if (item.timeTableTeacherSubject?.employeeSubject?.subjects) return { id: item.timeTableTeacherSubject.employeeSubject.subjects.subjectId, name: item.timeTableTeacherSubject.employeeSubject.subjects.subjectName };
    return { id: null, name: 'Unknown' };
  };

  // Sort for grouping
  classes.sort((a, b) => {
    if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
    if (a.timeTablecreate.timeTableRoutineId !== b.timeTablecreate.timeTableRoutineId)
      return a.timeTablecreate.timeTableRoutineId - b.timeTablecreate.timeTableRoutineId;

    const subjA = getSubjectInfo(a);
    const subjB = getSubjectInfo(b);
    if (subjA.id !== subjB.id) return (subjA.id || 0) - (subjB.id || 0);

    return parseInt(a.period) - parseInt(b.period);
  });

  const areConsecutivePeriods = (item1, item2) => {
    if (item1.timeTableNameId !== item2.timeTableNameId) return false;
    const structurePeriods = breakPeriodsMap.get(item1.timeTableNameId);
    if (!structurePeriods) return false;

    // Find the indices of item1 and item2 in the structure periods
    const idx1 = structurePeriods.findIndex(p => p.timeTableCreationId === item1.timeTableCreationId);
    const idx2 = structurePeriods.findIndex(p => p.timeTableCreationId === item2.timeTableCreationId);

    // They must be distinct valid periods
    if (idx1 === -1 || idx2 === -1 || idx1 === idx2) return false;

    const minIdx = Math.min(idx1, idx2);
    const maxIdx = Math.max(idx1, idx2);

    // Check all periods that fall between item1 and item2
    for (let i = minIdx + 1; i < maxIdx; i++) {
      if (!structurePeriods[i].isBreak) {
        // If there's a non-break period between them (e.g. another class), they are not consecutive
        return false;
      }
      if (structurePeriods[i].isBreak && sessionalBreak) {
        // If there's a break between them and sessionalBreak is true, we must split the group
        return false;
      }
    }
    return true;
  };

  let currentGroup = null;

  for (const item of classes) {
    const subj = getSubjectInfo(item);
    const periodNum = parseInt(item.period);

    let isConsecutive = false;
    if (currentGroup &&
      currentGroup.date === item.date &&
      currentGroup.timeTablecreate.timeTableRoutineId === item.timeTablecreate.timeTableRoutineId &&
      currentGroup.subjectId === subj.id
    ) {
      const lastItem = currentGroup.classScheduleItems[currentGroup.classScheduleItems.length - 1];
      if (areConsecutivePeriods(lastItem, item)) {
        isConsecutive = true;
      }
    }

    if (isConsecutive) {
      // Consecutive period — extend group through this period's end time
      currentGroup.classScheduleItems.push(item);
      currentGroup.periods.push(periodNum);

      const structurePeriods = breakPeriodsMap.get(item.timeTableNameId) || [];
      let structurePeriod = null;
      for (const p of structurePeriods) {
        if (p.timeTableCreationId === item.timeTableCreationId) {
          structurePeriod = p;
          break;
        }
      }

      const creation = item.timeTablecreation || {};
      const itemStart = creation.startTime || (structurePeriod && structurePeriod.startTime) || null;
      const itemEnd = creation.endTime || (structurePeriod && structurePeriod.endTime) || null;
      if (itemEnd) {
        currentGroup.endTime = itemEnd;
        currentGroup.timeTablecreation = {
          ...(currentGroup.timeTablecreation || {}),
          endTime: itemEnd,
        };
      }
      if (itemStart && !currentGroup.startTime) {
        currentGroup.startTime = itemStart;
        if (!currentGroup.timeTablecreation || !currentGroup.timeTablecreation.startTime) {
          currentGroup.timeTablecreation = {
            ...(currentGroup.timeTablecreation || {}),
            startTime: itemStart,
          };
        }
      }
    } else {
      // New group — span starts at this period
      const structurePeriods = breakPeriodsMap.get(item.timeTableNameId) || [];
      let structurePeriod = null;
      for (const p of structurePeriods) {
        if (p.timeTableCreationId === item.timeTableCreationId) {
          structurePeriod = p;
          break;
        }
      }

      const creation = item.timeTablecreation || {};
      const startTime = creation.startTime || (structurePeriod && structurePeriod.startTime) || null;
      const endTime = creation.endTime || (structurePeriod && structurePeriod.endTime) || null;
      const periodName = creation.periodName || (structurePeriod && structurePeriod.periodName) || null;
      currentGroup = {
        ...item,
        subjectId: subj.id,
        subjectName: subj.name,
        classScheduleItems: [item],
        periods: [periodNum],
        startTime,
        endTime,
        timeTablecreation: {
          timeTableCreationId: item.timeTableCreationId,
          periodName,
          startTime,
          endTime,
        },
      };
      groupedResult.push(currentGroup);
    }
  }

  return groupedResult;
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
    const routine = schedule.timeTablecreate;
    if (!routine) continue;

    const classSection = resolveTimeTableRoutineSection(routine);
    if (!classSection) continue;

    const routinePlain = routine.get ? routine.get({ plain: true }) : routine;
    const classSectionTermId =
      routinePlain.classSectionTermId
      ?? routinePlain.timeTableClassSectionTerm?.classSectionTermId
      ?? null;
    if (!classSectionTermId) continue;

    const term = routinePlain.timeTableClassSectionTerm?.term ?? null;
    const course = routine.timeTableCourse;

    const subject = extractSubjectDetails(schedule);
    if (!subject) continue;

    const key = `${classSectionTermId}_${subject.subjectId}`;
    if (!uniqueCombinationsMap.has(key)) {
      uniqueCombinationsMap.set(key, {
        courseId: course?.courseId,
        courseName: course?.courseName,
        classSectionTermId,
        classSectionsId: classSection.classSectionsId,
        year: classSection.year != null ? Number(classSection.year) : null,
        term: term != null ? Number(term) : null,
        section: classSection.section,
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        totalClasses: 0
      });
    }

    const entry = uniqueCombinationsMap.get(key);
    const startDateStr = routine.startingDate;
    const endDateStr = routine.endingDate;
    const dayStr = schedule.day;

    if (startDateStr && endDateStr && dayStr) {
      entry.totalClasses = decimalAdd(entry.totalClasses, countWeekdayInRange(startDateStr, endDateStr, dayStr));
    }
  }

  return Array.from(uniqueCombinationsMap.values());
}

function getEmployeeDetails(schedules) {
  if (!schedules.length || !schedules[0].employeeDetails) {
    return null;
  }

  const employee = schedules[0].employeeDetails.get
    ? schedules[0].employeeDetails.get({ plain: true })
    : schedules[0].employeeDetails;

  return {
    employeeId: employee.employeeId,
    employeeName: employee.employeeName,
    employmentType: employee.employmentType,
    departmentId: employee.departmentId ?? null,
    departmentName: employee.employeeDepartment?.departmentName || employee.departmentName || "",
    totalClasses: schedules.reduce((acc, schedule) => decimalAdd(acc, schedule.totalClasses || 0), 0),
    totalUniqueSubjects: schedules.length
  };
}

export async function getUniqueClassSectionSubjects(userId, academicYearId) {
  const schedules = await employeeScheduleRepository.getUniqueClassSectionSubjectsForEmployee(
    userId,
    academicYearId,
  );

  const employeeDetails = getEmployeeDetails(schedules);
  const combinations = processScheduleCombinations(schedules);

  return {
    employeeDetails,
    combinations,
  };
}

export async function getSectionCounts(userId, academicYearId, currentDateString) {
  const { pastCount, upcomingCount } = await employeeScheduleRepository.countEmployeeDateWiseSchedules(
    userId,
    academicYearId,
    currentDateString,
  );
  const allSchedules = await employeeScheduleRepository.getUniqueClassSectionSubjectsForEmployee(
    userId,
    academicYearId,
  );

  const combinations = processScheduleCombinations(allSchedules);
  const uniqueSubjects = new Set(combinations.map((c) => c.subjectId));

  return {
    pastCount,
    upcomingCount,
    uniqueSubjectsCount: uniqueSubjects.size,
  };
}
