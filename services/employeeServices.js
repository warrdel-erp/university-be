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

export async function addEmployee(data) {
    const transaction = await sequelize.transaction();
    try {
        // Add employee main information
        const employee = await employeeRepository.addEmployee(data, { transaction });
        const employeeId = employee.dataValues.employeeId;

        // Add employee address
        await employeeAddressRepository.addAddress({
            employeeId,
            ...data.address
        }, { transaction });

        // Add employee office details
        await employeeOfficeRepository.addOfficeDetails({
            employeeId,
            ...data.office
        }, { transaction });

        // Add employee roles
        for (const role of data.roles) {
            await employeeRoleRepository.addEmployeeRole({
                employeeId,
                role
            }, { transaction });
        }

        // Add employee skills
        for (const skill of data.skill) {
            await employeeSkillRepository.addEmployeeSkill({
                employeeId,
                ...skill
            }, { transaction });
        }

        // Add employee documents
        for (const document of data.documents) {
            await employeeDocumentRepository.addEmployeeDocuments({
                employeeId,
                ...document
            }, { transaction });
        }

        // Add employee qualifications
        for (const qualification of data.qualification) {
            await employeeQualificationRepository.addEmployeeQualification({
                employeeId,
                ...qualification
            }, { transaction });
        }

        // Add employee experiences
        for (const experience of data.experience) {
            await employeeExperianceRepository.addEmployeeExperiance({
                employeeId,
                ...experience
            }, { transaction });
        }

        // Add employee achievements
        for (const achievement of data.achievements) {
            await employeeAchivementRepository.addEmployeeAchievement({
                employeeId,
                ...achievement
            }, { transaction });
        }

        // Add employee wards
        for (const ward of data.ward) {
            await employeeWardRepository.addEmployeeWard({
                employeeId,
                ...ward
            }, { transaction });
        }

        // Add employee activities
        for (const activity of data.activity) {
            await employeeActivityRepository.addEmployeeActivity({
                employeeId,
                ...activity
            }, { transaction });
        }

        // Add employee references
        for (const reference of data.reference) {
            await employeeReferenceRepository.addEmployeeReference({
                employeeId,
                ...reference
            }, { transaction });
        }

        // Add employee research
        for (const research of data.research) {
            await employeeResearchRepository.addEmployeeResearch({
                employeeId,
                ...research
            }, { transaction });
        }

        // Add employee long leaves
        for (const longLeave of data.longLeave) {
            await employeeLongLeaveRepository.addEmployeeLongLeave({
                employeeId,
                ...longLeave
            }, { transaction });
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