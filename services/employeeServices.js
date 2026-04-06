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

// const data = { campusId: '1', instituteId: '1', resumeNumber: '12', employeeCode: '44', employeeName: 'AMIT', shortName: 'AMIT', dateOfBirth: '2024-09-02', anniversaryDate: '2024-09-02', fatherName: 'Darryl Jordan', motherName: 'Cailin Perkins', bodySign: 'A BLACK MOLE ON FACE', workingHours: '78', aicteCode: '44', from: '2024-09-02', to: '2024-09-02', vehicleNumber: 'ABC0101', drivingLicense: 'ABCD010101', drivingLicenseExpireDate: '2024-09-02', address: '{"pAddress":"DELHI","pPincode":"111111","cAddress":"DELHI","cPincode":"111111","phoneNumber":"1234567890","mobileNumber":"1234567890","officialMobileNumber":"1234567890","officialEmailId":"ABC@GMAIL.COM","personalEmail":"ABCD@GMAIL.COM"}', office: '{"joiningDate":"2024-09-02","confirmationDate":"2024-09-02","relievingDate":"2024-09-02","retirementDate":"2024-09-02","transferDate":"2024-09-02","resignationDate":"2024-09-02","noticePeriod":"12","employeeFileNumber":"12","istActive":true,"bankName":"ABC","accountNumber":"1234567890","ifscCode":"ABC123","iindActive":true,"contractBased":true,"gpf":"QWERTYU","esiNumber":"QWERTYU","uanNumber":"QWERTYU","lectureBased":true,"pfNumber":"QWERTYU","panNumber":"QWERTY1234","voterId":"ABC123","aadharNumber":"1234567890","spouseName":"AMITAMIT","nomineeName":"AMITAMITAMIT","officeExtensionNumber":"1234567890","employeeRank":"MANAGER"}', roles: '["Hostel","Transport"]', skill: '[{"name":"Kuldeep","experienceInMonth":"12","experienceInYear":"1","proficiencyLevel":1}]', documents: '[{"qualifications":1,"degreeLevel":1,"stream":1,"fromYear":"2024-09-02","toYear":"2024-09-02","universityBoard":"12122","medicalCouncilName":"12","medicalRegistrationNumber":"12","medicalCouncilRegistrationDate":"2024-09-02","medicalRegistrationExpiryDate":"2024-09-02","percentage":"1212","remarks":"12","pursuing":true}]', qualification: '[{"document":1,"receivedDate":"2024-09-02","returnedDate":"2024-09-02","documentCopy":"{}"}]', experience: '[{"experienceType":1,"organization":"12","designation":"12","fromDate":"2024-09-02","toDate":"2024-09-02","totalExperienceMonths":"12","totalExperienceYears":"12","totalExperienceDays":"12","lastSalary":"12","remarks":"12"}]', achievements: '[{"achievementCategory":1,"title":"12","description":"21","noOfTimes":"12","discipline":"12","date":"2024-09-02","nameOf":"12121"}]', ward: '[{"wardName":"12","studyIn":"12","annualFees":"12","dateOfBirth":"2024-09-02"}]', activity: '[{"activity":"21","monthYear":"2024-09-02","remarks":"12"}]', reference: '[{"name":"12","designation":"12","mobaileNumber":"12","address":"12"}]', research: '[{"thesisName":"12","associate":"12","periodFrom":"2024-09-02","to":"2024-09-02","institution":"1212"}]', longLeave: '[{"leaveType":1,"dateOfLeaving":"2024-09-02","dateOfRejoining":"2024-09-02","remark":"12"}]', allDropDownData: '{"type":[],"code":[]}' }
export async function addEmployee(data, files, createdBy, universityId, roleId, instituteId) {

  const transaction = await sequelize.transaction();
  try {
    const address = data.address ? JSON.parse(data.address) : null;
    const corsAddress = data.corsAddress ? JSON.parse(data.corsAddress) : null;
    const office = data.office ? JSON.parse(data.office) : null;
    // const role = data.roles ? JSON.parse(data.roles) : null;
    const skills = data.skill ? JSON.parse(data.skill) : [];
    const documents = data.documents ? JSON.parse(data.documents) : [];
    const qualifications = data.qualification ? JSON.parse(data.qualification) : [];
    const experiences = data.experience ? JSON.parse(data.experience) : [];
    const achievements = data.achievements ? JSON.parse(data.achievements) : [];
    const wards = data.ward ? JSON.parse(data.ward) : [];
    const activities = data.activity ? JSON.parse(data.activity) : [];
    const references = data.reference ? JSON.parse(data.reference) : [];
    const research = data.research ? JSON.parse(data.research) : [];
    const longLeaves = data.longLeave ? JSON.parse(data.longLeave) : [];


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
    if (data.roleData) {
      const roleData = data.roleData
      await userRoleService.assignRoleToUser(userId, roleData.role, roleData.permissions, transaction);
    } else {
      throw new Error("Role data is required")
    }

    // Add employee 
    data.createdBy = createdBy
    data.roleId = roleId
    data.userId = userId;
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

    // Add employee cor-address
    await employeeAddressRepository.addCorsAddress({
      employeeId,
      createdBy,
      ...corsAddress
    }, transaction);

    // Add employee office details
    await employeeOfficeRepository.addOfficeDetails({
      employeeId,
      createdBy,
      ...office
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

    // Add employee documents
    for (const document of documents) {
      await employeeDocumentRepository.addEmployeeDocuments({
        employeeId,
        createdBy,
        ...document
      }, transaction);
    }

    // Add employee qualifications
    for (const qualification of qualifications) {
      await employeeQualificationRepository.addEmployeeQualification({
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


    if (roleName?.trim().toLowerCase() === 'admin') {
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
  return await employeeRepository.getAllEmployee(universityId, campusId, instituteId, acedmicYearId, headInstituteId, role)
};

export async function getSingleEmployeeDetails(employeeId, universityId) {
  return await employeeRepository.getSingleEmployeeDetails(employeeId, universityId)
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

    // array
    const skills = typeof data.skill === 'string' && data.skill ? JSON.parse(data.skill) : data.skill || [];
    const documents = typeof data.documents === 'string' && data.documents ? JSON.parse(data.documents) : data.documents || [];
    const qualifications = typeof data.qualification === 'string' && data.qualification ? JSON.parse(data.qualification) : data.qualification || [];
    const experiences = typeof data.experience === 'string' && data.experience ? JSON.parse(data.experience) : data.experience || [];
    const achievements = typeof data.achievements === 'string' && data.achievements ? JSON.parse(data.achievements) : data.achievements || [];
    const wards = typeof data.ward === 'string' && data.ward ? JSON.parse(data.ward) : data.ward || [];
    const activities = typeof data.activity === 'string' && data.activity ? JSON.parse(data.activity) : data.activity || [];
    const references = typeof data.reference === 'string' && data.reference ? JSON.parse(data.reference) : data.reference || [];
    const research = typeof data.research === 'string' && data.research ? JSON.parse(data.research) : data.research || [];
    const longLeaves = typeof data.longLeave === 'string' && data.longLeave ? JSON.parse(data.longLeave) : data.longLeave || [];
    const allDropDownData = typeof data.allDropDownData === 'string' && data.allDropDownData ? JSON.parse(data.allDropDownData) : data.allDropDownData || { type: [], code: [] };

    //  Update main employee table
    await employeeRepository.updateEmployee(employeeId, {
      ...data,
      roleId,
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
      await employeeAddressRepository.updateAddress(employeeId, {
        updatedBy,
        ...address
      }, transaction);
    }

    if (corsAddress) {
      await employeeAddressRepository.updateCorsAddress(employeeId, {
        updatedBy,
        ...corsAddress
      }, transaction);
    }

    //  Update Office details
    if (office) {
      await employeeOfficeRepository.updateOfficeDetails(employeeId, {
        updatedBy,
        ...office
      }, transaction);
    }

    //  Update Skills
    if (skills && skills.length > 0) {
      await employeeSkillRepository.refreshEmployeeSkills(
        employeeId,
        skills,
        createdBy,
        updatedBy,
        transaction
      );
    }

    //  Update Documents
    if (documents && documents.length > 0) {
      await employeeDocumentRepository.refreshEmployeeDocuments(
        employeeId,
        documents,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update Qualifications
    if (qualifications && qualifications.length > 0) {
      await employeeQualificationRepository.refreshEmployeeQualifications(
        employeeId,
        qualifications,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update Experiences
    if (experiences && experiences.length > 0) {
      await employeeExperianceRepository.refreshEmployeeExperiences(
        employeeId,
        experiences,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update Achievements
    if (achievements && achievements.length > 0) {
      await employeeAchivementRepository.refreshEmployeeAchievements(
        employeeId,
        achievements,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update Wards
    if (wards && wards.length > 0) {
      await employeeWardRepository.refreshEmployeeWards(
        employeeId,
        wards,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update Activities
    if (activities && activities.length > 0) {
      await employeeActivityRepository.refreshEmployeeActivities(
        employeeId,
        activities,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update References
    if (references && references.length > 0) {
      await employeeReferenceRepository.refreshEmployeeReferences(
        employeeId,
        references,
        createdBy,
        updatedBy,
        transaction
      );
    }

    // Update Research
    if (research && research.length > 0) {
      await employeeResearchRepository.refreshEmployeeResearch(
        employeeId,
        research,
        createdBy,
        updatedBy,
        transaction
      );
    }

    //  Update Long Leaves
    if (longLeaves && longLeaves.length > 0) {
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
