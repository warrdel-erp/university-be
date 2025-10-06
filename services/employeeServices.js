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
import {employeeRegister} from '../services/userServices.js'

// const data = { campusId: '1', instituteId: '1', resumeNumber: '12', employeeCode: '44', employeeName: 'AMIT', shortName: 'AMIT', dateOfBirth: '2024-09-02', anniversaryDate: '2024-09-02', fatherName: 'Darryl Jordan', motherName: 'Cailin Perkins', bodySign: 'A BLACK MOLE ON FACE', workingHours: '78', aicteCode: '44', from: '2024-09-02', to: '2024-09-02', vehicleNumber: 'ABC0101', drivingLicense: 'ABCD010101', drivingLicenseExpireDate: '2024-09-02', address: '{"pAddress":"DELHI","pPincode":"111111","cAddress":"DELHI","cPincode":"111111","phoneNumber":"1234567890","mobileNumber":"1234567890","officialMobileNumber":"1234567890","officialEmailId":"ABC@GMAIL.COM","personalEmail":"ABCD@GMAIL.COM"}', office: '{"joiningDate":"2024-09-02","confirmationDate":"2024-09-02","relievingDate":"2024-09-02","retirementDate":"2024-09-02","transferDate":"2024-09-02","resignationDate":"2024-09-02","noticePeriod":"12","employeeFileNumber":"12","istActive":true,"bankName":"ABC","accountNumber":"1234567890","ifscCode":"ABC123","iindActive":true,"contractBased":true,"gpf":"QWERTYU","esiNumber":"QWERTYU","uanNumber":"QWERTYU","lectureBased":true,"pfNumber":"QWERTYU","panNumber":"QWERTY1234","voterId":"ABC123","aadharNumber":"1234567890","spouseName":"AMITAMIT","nomineeName":"AMITAMITAMIT","officeExtensionNumber":"1234567890","employeeRank":"MANAGER"}', roles: '["Hostel","Transport"]', skill: '[{"name":"Kuldeep","experienceInMonth":"12","experienceInYear":"1","proficiencyLevel":1}]', documents: '[{"qualifications":1,"degreeLevel":1,"stream":1,"fromYear":"2024-09-02","toYear":"2024-09-02","universityBoard":"12122","medicalCouncilName":"12","medicalRegistrationNumber":"12","medicalCouncilRegistrationDate":"2024-09-02","medicalRegistrationExpiryDate":"2024-09-02","percentage":"1212","remarks":"12","pursuing":true}]', qualification: '[{"document":1,"receivedDate":"2024-09-02","returnedDate":"2024-09-02","documentCopy":"{}"}]', experience: '[{"experienceType":1,"organization":"12","designation":"12","fromDate":"2024-09-02","toDate":"2024-09-02","totalExperienceMonths":"12","totalExperienceYears":"12","totalExperienceDays":"12","lastSalary":"12","remarks":"12"}]', achievements: '[{"achievementCategory":1,"title":"12","description":"21","noOfTimes":"12","discipline":"12","date":"2024-09-02","nameOf":"12121"}]', ward: '[{"wardName":"12","studyIn":"12","annualFees":"12","dateOfBirth":"2024-09-02"}]', activity: '[{"activity":"21","monthYear":"2024-09-02","remarks":"12"}]', reference: '[{"name":"12","designation":"12","mobaileNumber":"12","address":"12"}]', research: '[{"thesisName":"12","associate":"12","periodFrom":"2024-09-02","to":"2024-09-02","institution":"1212"}]', longLeave: '[{"leaveType":1,"dateOfLeaving":"2024-09-02","dateOfRejoining":"2024-09-02","remark":"12"}]', allDropDownData: '{"type":[],"code":[]}' }
export async function addEmployee(data,files,createdBy,universityId,roleId,instituteId) {  
    
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


        // Add employee 
        data.createdBy = createdBy
        data.roleId = roleId
        const employee = await employeeRepository.addEmployee(data,transaction );
        const employeeId = employee.dataValues.employeeId;
        const {employeeName} = employee.dataValues
        
        const employeeRegisterData = {universityId,roleId,employeeName,employeeId,instituteId}

        // image upload
        if(files){
            const uploadPromises = Object.keys(files).map(async key => {
                const file = files[key];
                const s3Response = await uploadFile(file);
                const url = s3Response.Location;
                const data = { key, url ,employeeId,createdBy};
                await employeeFilesRepository.addEmployeeFiles(data,  transaction );
            });
          
              await Promise.all(uploadPromises);
        }

        // Add employee address
        const addressDetail = await employeeAddressRepository.addAddress({
            employeeId,
            createdBy,
            ...address
        }, transaction);
        const {personalEmail,mobileNumber} = addressDetail.dataValues
        const employeePersonalDetail = {personalEmail,mobileNumber}

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
            },  transaction );
        }

        // Add employee experiences
        for (const experience of experiences) {
            await employeeExperianceRepository.addEmployeeExperiance({
                employeeId,
                createdBy,
                ...experience
            }, transaction );
        }

        // Add employee achievements
        for (const achievement of achievements) {
            await employeeAchivementRepository.addEmployeeAchievement({
                employeeId,
                createdBy,
                ...achievement
            },  transaction );
        }

        // Add employee wards
        for (const ward of wards) {
            await employeeWardRepository.addEmployeeWard({
                employeeId,
                createdBy,
                ...ward
            },  transaction );
        }

        // Add employee activities
        for (const activity of activities) {
            await employeeActivityRepository.addEmployeeActivity({
                employeeId,
                createdBy,
                ...activity
            }, transaction );
        }

        // Add employee references
        for (const reference of references) {
            await employeeReferenceRepository.addEmployeeReference({
                employeeId,
                createdBy,
                ...reference
            },  transaction );
        }

        // Add employee research
        for (const researchItem of research) {
            await employeeResearchRepository.addEmployeeResearch({
                employeeId,
                createdBy,
                ...researchItem
            },  transaction );
        }

        // Add employee long leaves
        for (const longLeave of longLeaves) {
            await employeeLongLeaveRepository.addEmployeeLongLeave({
                employeeId,
                createdBy,
                ...longLeave
            },  transaction );
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

        await employeeMetaDataRepository.employeeMetaData(entries,  transaction );
      } else {
        throw new Error('Invalid format for allDropDownData.');
      }
    }
        await employeeRegister (employeePersonalDetail,employeeRegisterData,transaction)
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

export async function getAllEmployee(universityId,campusId,instituteId,acedmicYearId,headInstituteId,role){
    return await employeeRepository.getAllEmployee(universityId,campusId,instituteId,acedmicYearId,headInstituteId,role)
};

export async function getSingleEmployeeDetails(employeeId,universityId){
    return await employeeRepository.getSingleEmployeeDetails(employeeId,universityId)
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

      const employeeData = {
        employeeName: convertedData.employeeName,
        employeeCode: convertedData.employeeCode ? convertedData.employeeCode : "KY01012025" ,
        employmentType: convertedData.employmentType,
        dateOfBirth: convertedData.dateOfBirth,
        fatherName: convertedData.fatherName,
        department:convertedData.department,
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


     const result =  await employeeRepository.createEmployeeWithDetails(employeeData, officeData, addressData, transaction);
     const employeeId = result.dataValues.employeeId

          
              const employeeRegisterData = {
                instituteId: convertedData.instituteId,
                roleId: convertedData.roleId,
                employeeName: convertedData.employeeName,
                universityId:convertedData.universityId,
                employeeId
            }
                    const employeePersonalDetail = {
                        personalEmail: convertedData.personalEmail,
                        mobileNumber: convertedData.mobileNumber
                    }

        await employeeRegister (employeePersonalDetail,employeeRegisterData,transaction)

    }

    await transaction.commit();
    return { success: true, message: "All employees imported successfully" };

  } catch (error) {
    await transaction.rollback();
    console.error("Error in importing employee data:", error.message);
    return { success: false, error: error.message };
  }
};
export async function updateEmployee(employeeId, data, files, updatedBy,createdBy, universityId, roleId, instituteId) {
  console.log(`>>>>>>>>>>>data`,data);
  
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
        await employeeFilesRepository.updateEmployee(employeeId,fileData, transaction);
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

        await employeeMetaDataRepository.updateEmployeeMetaData( entries, transaction);
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