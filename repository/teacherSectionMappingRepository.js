import * as model from '../models/index.js';
import { buildScope } from '../utility/scoped.js';
import { requestContext } from '../utility/requestContext.js';

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

async function findClassSectionInInstitute(classSectionsId) {
    return model.classSectionModel.unscoped().findOne({
        where: { classSectionsId, ...buildInstituteScope(model.classSectionModel) },
        attributes: ['classSectionsId'],
    });
}

async function findTeacherSectionMappingInInstitute(teacherSectionMappingId) {
    return model.teacherSectionMappingModel.findOne({
        where: { teacherSectionMappingId },
        attributes: ['teacherSectionMappingId', 'employeeId', 'classSectionsId'],
        include: [
            {
                model: model.employeeModel.unscoped(),
                as: 'employeeData',
                where: buildInstituteScope(model.employeeModel),
                required: true,
                attributes: ['employeeId'],
            },
            {
                model: model.classSectionModel.unscoped(),
                as: 'employeeSection',
                where: buildInstituteScope(model.classSectionModel),
                required: true,
                attributes: ['classSectionsId'],
            },
        ],
    });
}

export async function teacherSectionMapping(data) {
    try {
        const employee = await findEmployeeInInstitute(data.employeeId);
        if (!employee) {
            throw new Error(`Employee ID ${data.employeeId} not found`);
        }

        const classSection = await findClassSectionInInstitute(data.classSectionsId);
        if (!classSection) {
            throw new Error(`Class section ID ${data.classSectionsId} not found`);
        }

        return await model.teacherSectionMappingModel.create(data);
    } catch (error) {
        console.error('Error in student mapping course:', error);
        throw error;
    }
}

export async function getTeacherSectionMapping(employeeId) {
    try {
        const universityId = requestContext.getStore()?.universityId;
        const classSectionWhere = buildInstituteScope(model.classSectionModel);
        const employeeWhere = buildInstituteScope(model.employeeModel);
        const courseWhere = buildInstituteScope(model.courseModel);

        return await model.teacherSectionMappingModel.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            ...(employeeId && { where: { employeeId } }),
            include: [
                {
                    model: model.userModel.unscoped(),
                    as: 'userTeacherSectionMapping',
                    attributes: ['universityId', 'userId'],
                    where: { universityId },
                    required: true,
                },
                {
                    model: model.employeeModel.unscoped(),
                    as: 'employeeData',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                    where: employeeWhere,
                    required: true,
                    include: [
                        {
                            model: model.campusModel.unscoped(),
                            as: 'employeeCampus',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'campusId', 'campusCode'] },
                            where: { universityId },
                            required: true,
                        },
                        {
                            model: model.instituteModel.unscoped(),
                            as: 'employeeInstitute',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'campusId', 'instituteCode'] },
                        },
                    ],
                },
                {
                    model: model.classSectionModel.unscoped(),
                    as: 'employeeSection',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                    where: classSectionWhere,
                    required: true,
                    include: [
                        {
                            model: model.courseModel.unscoped(),
                            as: 'employeeCourse',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                            where: courseWhere,
                            required: true,
                        },
                        {
                            model: model.sessionModel.unscoped(),
                            as: 'classSession',
                            attributes: ['sessionId', 'sessionName', 'startingDate', 'endingDate', 'classTillDate'],
                            required: false,
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error(`Error in getting employee code and types ${employeeId}:`, error);
        throw error;
    }
}

export async function updateTeachersSectionMapping(teacherSectionMappingId, info) {
    try {
        const existing = await findTeacherSectionMappingInInstitute(teacherSectionMappingId);
        if (!existing) {
            throw new Error('Mapping not found');
        }

        if (info.employeeId != null) {
            const employee = await findEmployeeInInstitute(info.employeeId);
            if (!employee) {
                throw new Error(`Employee ID ${info.employeeId} not found`);
            }
        }

        if (info.classSectionsId != null) {
            const classSection = await findClassSectionInInstitute(info.classSectionsId);
            if (!classSection) {
                throw new Error(`Class section ID ${info.classSectionsId} not found`);
            }
        }

        return await model.teacherSectionMappingModel.update(info, {
            where: { teacherSectionMappingId },
        });
    } catch (error) {
        console.error(`Error updating teacher subject mapping ${teacherSectionMappingId} :`, error);
        throw error;
    }
}

export async function deleteTeachersSectionMapping(teacherSectionMappingId) {
    try {
        const existing = await findTeacherSectionMappingInInstitute(teacherSectionMappingId);
        if (!existing) {
            throw new Error('Mapping not found');
        }

        await model.teacherSectionMappingModel.destroy({
            where: { teacherSectionMappingId },
            individualHooks: true,
        });
        return { message: 'delete Teacher Section Mapping deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw error;
    }
}
