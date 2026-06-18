import * as model from '../models/index.js';
import { buildScope } from '../utility/scoped.js';

function buildInstituteScope(modelRef) {
    const scope = buildScope(modelRef);
    delete scope.acedmicYearId;
    return scope;
}

async function findEmployeeInInstitute(employeeId) {
    return model.employeeModel.unscoped().findOne({
        where: { employeeId, ...buildInstituteScope(model.employeeModel) },
        attributes: ['employeeId'],
    });
}

async function findClassSubjectMapperInInstitute(classSubjectMapperId) {
    return model.classSubjectMapperModel.unscoped().findOne({
        where: { classSubjectMapperId, ...buildInstituteScope(model.classSubjectMapperModel) },
        attributes: ['classSubjectMapperId'],
    });
}

async function findTeacherSubjectMappingInInstitute(teacherSubjectMappingId) {
    return model.teacherSubjectMappingModel.findOne({
        where: { teacherSubjectMappingId },
        attributes: ['teacherSubjectMappingId', 'employeeId', 'classSubjectMapperId'],
        include: [
            {
                model: model.employeeModel.unscoped(),
                as: 'teacherEmployeeData',
                where: buildInstituteScope(model.employeeModel),
                required: true,
                attributes: ['employeeId'],
            },
            {
                model: model.classSubjectMapperModel.unscoped(),
                as: 'employeeSubject',
                where: buildInstituteScope(model.classSubjectMapperModel),
                required: true,
                attributes: ['classSubjectMapperId'],
            },
        ],
    });
}

export async function teacherSubjectMapping(data) {
    try {
        const employee = await findEmployeeInInstitute(data.employeeId);
        if (!employee) {
            throw new Error(`Employee ID ${data.employeeId} not found`);
        }

        const mapper = await findClassSubjectMapperInInstitute(data.classSubjectMapperId);
        if (!mapper) {
            throw new Error(`Class subject mapper ID ${data.classSubjectMapperId} not found`);
        }

        return await model.teacherSubjectMappingModel.create(data);
    } catch (error) {
        console.error('Error in teacher Subject Mapping:', error);
        throw error;
    }
}

export async function getTeacherSubjectMapping(employeeId, subjectId, sessionId, acedmicYearId) {
    try {
        const mapperWhere = {
            ...buildInstituteScope(model.classSubjectMapperModel),
            ...(subjectId && { subjectId }),
        };

        const subjectWhere = {
            ...buildInstituteScope(model.subjectModel),
            ...(subjectId && { subjectId }),
            ...(acedmicYearId && { acedmicYearId }),
        };

        const semesterWhere = {
            ...buildInstituteScope(model.semesterModel),
            ...(acedmicYearId && { acedmicYearId }),
        };

        const employeeWhere = buildInstituteScope(model.employeeModel);

        return await model.teacherSubjectMappingModel.findAll({
            where: employeeId ? { employeeId } : undefined,
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            include: [
                {
                    model: model.employeeModel.unscoped(),
                    as: 'teacherEmployeeData',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                    where: employeeWhere,
                    required: true,
                    include: [
                        {
                            model: model.instituteModel.unscoped(),
                            as: 'employeeInstitute',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'campusId', 'instituteCode'] },
                            required: false,
                        },
                    ],
                },
                {
                    model: model.classSubjectMapperModel.unscoped(),
                    as: 'employeeSubject',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                    where: mapperWhere,
                    required: true,
                    include: [
                        {
                            model: model.subjectModel.unscoped(),
                            as: 'subjects',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                            where: subjectWhere,
                            required: true,
                            include: [
                                {
                                    model: model.courseModel.unscoped(),
                                    as: 'courseInfo',
                                    attributes: ['courseId', 'courseName', 'courseCode'],
                                    required: false,
                                },
                            ],
                        },
                        {
                            model: model.semesterModel.unscoped(),
                            as: 'employeeClassSection',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                            where: semesterWhere,
                            required: Boolean(acedmicYearId),
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
        const existing = await findTeacherSubjectMappingInInstitute(teacherSubjectMappingId);
        if (!existing) {
            throw new Error('Mapping not found');
        }

        if (info.employeeId != null) {
            const employee = await findEmployeeInInstitute(info.employeeId);
            if (!employee) {
                throw new Error(`Employee ID ${info.employeeId} not found`);
            }
        }

        if (info.classSubjectMapperId != null) {
            const mapper = await findClassSubjectMapperInInstitute(info.classSubjectMapperId);
            if (!mapper) {
                throw new Error(`Class subject mapper ID ${info.classSubjectMapperId} not found`);
            }
        }

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
        const existing = await findTeacherSubjectMappingInInstitute(teacherSubjectMappingId);
        if (!existing) {
            throw new Error('Mapping not found');
        }

        await model.teacherSubjectMappingModel.destroy({
            where: { teacherSubjectMappingId },
            individualHooks: true,
        });
        return { message: 'teacher Subject Mapping deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw error;
    }
}

export async function getTeacherDetailsByTeacherSubjectId(teacherSubjectMappingId) {
    try {
        return await model.teacherSubjectMappingModel.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            where: { teacherSubjectMappingId },
        });
    } catch (error) {
        console.error(`Error in getting teacher details by teacher subject mapper id ${teacherSubjectMappingId}:`, error);
        throw error;
    }
}
