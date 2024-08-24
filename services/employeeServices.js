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
import * as employeeMetaDataRepository from '../repository/employeeMetaDataRepository.js'

export async function addEmployee(data) {
    console.log(`>>>>>>data>>>>>>>>>.`,data);    
    
    const transaction = await sequelize.transaction();
    try {
        // Parse JSON fields
        const address = JSON.parse(data.address);
        const office = JSON.parse(data.office);
        const roles = JSON.parse(data.roles);
        const skills = JSON.parse(data.skill);
        const documents = JSON.parse(data.documents);
        const qualifications = JSON.parse(data.qualification);
        const experiences = JSON.parse(data.experience);
        const achievements = JSON.parse(data.achievements);
        const wards = JSON.parse(data.ward);
        const activities = JSON.parse(data.activity);
        const references = JSON.parse(data.reference);
        const research = JSON.parse(data.research);
        const longLeaves = JSON.parse(data.longLeave);

        // Add employee 
        const employee = await employeeRepository.addEmployee(data, { transaction });
        const employeeId = employee.dataValues.employeeId;

        // Add employee address
        await employeeAddressRepository.addAddress({
            employeeId,
            ...address
        }, { transaction });

        // Add employee office details
        await employeeOfficeRepository.addOfficeDetails({
            employeeId,
            ...office
        }, { transaction });

        // Add employee roles
        for (const role of roles) {
            await employeeRoleRepository.addEmployeeRole({
                employeeId,
                role
            }, { transaction });
        }

        // Add employee skills
        for (const skill of skills) {
            await employeeSkillRepository.addEmployeeSkill({
                employeeId,
                ...skill
            }, { transaction });
        }

        // Add employee documents
        for (const document of documents) {
            await employeeDocumentRepository.addEmployeeDocuments({
                employeeId,
                ...document
            }, { transaction });
        }

        // Add employee qualifications
        for (const qualification of qualifications) {
            await employeeQualificationRepository.addEmployeeQualification({
                employeeId,
                ...qualification
            }, { transaction });
        }

        // Add employee experiences
        for (const experience of experiences) {
            await employeeExperianceRepository.addEmployeeExperiance({
                employeeId,
                ...experience
            }, { transaction });
        }

        // Add employee achievements
        for (const achievement of achievements) {
            await employeeAchivementRepository.addEmployeeAchievement({
                employeeId,
                ...achievement
            }, { transaction });
        }

        // Add employee wards
        for (const ward of wards) {
            await employeeWardRepository.addEmployeeWard({
                employeeId,
                ...ward
            }, { transaction });
        }

        // Add employee activities
        for (const activity of activities) {
            await employeeActivityRepository.addEmployeeActivity({
                employeeId,
                ...activity
            }, { transaction });
        }

        // Add employee references
        for (const reference of references) {
            await employeeReferenceRepository.addEmployeeReference({
                employeeId,
                ...reference
            }, { transaction });
        }

        // Add employee research
        for (const researchItem of research) {
            await employeeResearchRepository.addEmployeeResearch({
                employeeId,
                ...researchItem
            }, { transaction });
        }

        // Add employee long leaves
        for (const longLeave of longLeaves) {
            await employeeLongLeaveRepository.addEmployeeLongLeave({
                employeeId,
                ...longLeave
            }, { transaction });
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
          types,
          codes: code[index]
        }));

        await employeeMetaDataRepository.employeeMetaData(entries, { transaction });
      } else {
        throw new Error('Invalid format for allDropDownData.');
      }
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

export async function getAllEmployee(){
    return await employeeRepository.getAllEmployee()
};

export async function getSingleEmployeeDetails(employeeId){
    return await employeeRepository.getSingleEmployeeDetails(employeeId)
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
  }  