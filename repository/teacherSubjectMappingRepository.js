import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function teacherSubjectMapping(data) {    
    try {
        const result = await model.teacherSubjectMappingModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in teacher Subject Mapping:", error);
        throw error;
    }
};

export async function getTeacherSubjectMapping(employeeId, universityId, acedmicYearId, instituteId, role) {
    try {
        const academicInstituteFilter = {
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && { instituteId })
        };

        const queryOptions = {
            where: employeeId ? { employeeId } : undefined,
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.userModel,
                    as: "userTeacherSubjectMapping",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model: model.employeeModel,
                    as: "teacherEmployeeData",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: academicInstituteFilter,
                    include: [
                        {
                            model: model.campusModel,
                            as: "employeeCampus",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "campusId", "campusCode"] }
                        },
                        {
                            model: model.instituteModel,
                            as: "employeeInstitute",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "instituteId", "campusId", "instituteCode"] }
                        },
                        {
                            model :model.acedmicYearModel,
                            as :"acedmicYear",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
                        }
                    ]
                },
                {
                    model: model.classSubjectMapperModel,
                    as: "employeeSubject",
                    required: false,
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.semesterModel,
                            as: "employeeClassSection",
                            required: false,
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            where: academicInstituteFilter,
                            include:[
                                {
                                    model :model.classSectionModel,
                                    as :'classSections',
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                                },
                                
                            ]
                        },
                        {
                            model:model.subjectModel,
                            as:'subjects',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                        }
                    ]
                }
            ]
        };

        return await model.teacherSubjectMappingModel.findAll(queryOptions);
    } catch (error) {
        throw new Error(`Failed to fetch teacher subject mapping: ${error.message}`);
    }
};

export async function updateTeachersSubjectMapping(teacherSubjectMappingId, info) {
    
    try {
        const result = await model.teacherSubjectMappingModel.update(info, {
            where: {
                teacherSubjectMappingId: teacherSubjectMappingId
            },
        });
        
        return result; 
    } catch (error) {
        console.error(`Error updating teacher subject mapping details ${teacherSubjectMappingId}:`, error);
        throw error; 
    }
};

export async function deleteTeachersSubjectMapping (teacherSubjectMappingId) {
    try {
        const result = await model.teacherSubjectMappingModel.destroy({
            where: { teacherSubjectMappingId },
            individualHooks: true
        });
        return { message: 'teacher Subject Mapping deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function getTeacherDetailsByTeacherSubjectId(teacherSubjectMappingId) {
    try {
        const result = await model.teacherSubjectMappingModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where:{
                teacherSubjectMappingId:teacherSubjectMappingId,
            }
        });
        return result;
    } catch (error) {
        console.error(`Error in getting teacher details by teacher subject mapper id ${teacherSubjectMappingId}:`, error);
        throw error;
    };
};