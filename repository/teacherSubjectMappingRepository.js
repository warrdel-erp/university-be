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
            ...(instituteId && { instituteId }),
        };

        const semesterWhere = {
            universityId,
            ...(instituteId && { instituteId }),
            ...(acedmicYearId && { acedmicYearId }),
        };

        const mapperWhere = {
            ...(instituteId && { instituteId }),
        };

        const subjectWhere = {
            universityId,
            ...(instituteId && { instituteId }),
            ...(acedmicYearId && { acedmicYearId }),
        };

        const classSectionWhere = {
            ...(acedmicYearId && { acedmicYearId }),
            ...(instituteId && { instituteId }),
        };

        const queryOptions = {
            where: employeeId ? { employeeId } : undefined,
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.userModel,
                    as: "userTeacherSubjectMapping",
                    attributes: ["universityId", "userId"],
                    where: { universityId },
                    required: true,
                },
                {
                    model: model.employeeModel,
                    as: "teacherEmployeeData",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: academicInstituteFilter,
                    required: true,
                    include: [
                        {
                            model: model.campusModel,
                            as: "employeeCampus",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "campusId", "campusCode"] },
                            where: { universityId },
                            required: true,
                        },
                        {
                            model: model.instituteModel,
                            as: "employeeInstitute",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "campusId", "instituteCode"] },
                            ...(instituteId && {
                                where: { instituteId },
                                required: true,
                            }),
                        },
                        {
                            model: model.acedmicYearModel,
                            as: "acedmicYear",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        },
                    ],
                },
                {
                    model: model.classSubjectMapperModel,
                    as: "employeeSubject",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: mapperWhere,
                    required: true,
                    include: [
                        {
                            model: model.semesterModel,
                            as: "employeeClassSection",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            where: semesterWhere,
                            required: true,
                            include: [
                                {
                                    model: model.classSectionModel,
                                    as: "classSections",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                                    where: classSectionWhere,
                                    required: true,
                                },
                            ],
                        },
                        {
                            model: model.subjectModel,
                            as: "subjects",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                            where: subjectWhere,
                            required: true,
                        },
                    ],
                },
            ],
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