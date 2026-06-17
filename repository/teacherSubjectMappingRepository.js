import * as model from '../models/index.js'
import { buildScope } from '../utility/scoped.js';
import { requestContext } from '../utility/requestContext.js';

export async function teacherSubjectMapping(data) {
    try {
        return await model.teacherSubjectMappingModel.create(data);
    } catch (error) {
        console.error('Error in teacher Subject Mapping:', error);
        throw error;
    }
}

export async function getTeacherSubjectMapping(employeeId, subjectId, sessionId) {
    try {
        const subjectWhere = {
            ...buildScope(model.subjectModel),
            ...(subjectId && { subjectId }),
        };

        const mapperWhere = {
            ...buildScope(model.classSubjectMapperModel),
            ...(subjectId && { subjectId }),
        };

        const classSectionWhere = {
            ...buildScope(model.classSectionModel),
            ...(sessionId && { sessionId }),
        };

        const employeeWhere = buildScope(model.employeeModel);

        return await model.teacherSubjectMappingModel.findAll({
            where: employeeId ? { employeeId } : undefined,
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.employeeModel.unscoped(),
                    as: "teacherEmployeeData",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: employeeWhere,
                    required: true,
                    include: [
                        {
                            model: model.instituteModel.unscoped(),
                            as: "employeeInstitute",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "campusId", "instituteCode"] },
                            required: false,
                        },
                    ],
                },
                {
                    model: model.classSubjectMapperModel.unscoped(),
                    as: "employeeSubject",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: mapperWhere,
                    required: true,
                    include: [
                        {
                            model: model.subjectModel.unscoped(),
                            as: "subjects",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                            where: subjectWhere,
                            required: true,
                            include: [
                                {
                                    model: model.courseModel.unscoped(),
                                    as: "courseInfo",
                                    attributes: ["courseId", "courseName", "courseCode"],
                                    required: false,
                                },
                            ],
                        },
                        {
                            model: model.semesterModel.unscoped(),
                            as: "employeeClassSection",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            required: Boolean(sessionId),
                            include: [
                                {
                                    model: model.classSectionModel.unscoped(),
                                    as: "semesterDetail",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                                    required: Boolean(sessionId),
                                    ...(Object.keys(classSectionWhere).length && { where: classSectionWhere }),
                                    include: [
                                        {
                                            model: model.sessionModel.unscoped(),
                                            as: "classSession",
                                            attributes: ["sessionId", "sessionName", "startingDate", "endingDate", "classTillDate"],
                                            required: false,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        throw new Error(`Failed to fetch teacher subject mapping: ${error.message}`);
    }
}

export async function updateTeachersSubjectMapping(teacherSubjectMappingId, info) {
    try {
        return await model.teacherSubjectMappingModel.update(info, {
            where: { teacherSubjectMappingId },
        });
    } catch (error) {
        console.error(`Error updating teacher subject mapping details ${teacherSubjectMappingId}:`, error);
        throw error;
    }
}

export async function deleteTeachersSubjectMapping(teacherSubjectMappingId) {
    try {
        await model.teacherSubjectMappingModel.destroy({
            where: { teacherSubjectMappingId },
            individualHooks: true,
        });
        return { message: 'teacher Subject Mapping deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
}

export async function getTeacherDetailsByTeacherSubjectId(teacherSubjectMappingId) {
    try {
        return await model.teacherSubjectMappingModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: { teacherSubjectMappingId },
        });
    } catch (error) {
        console.error(`Error in getting teacher details by teacher subject mapper id ${teacherSubjectMappingId}:`, error);
        throw error;
    }
}
