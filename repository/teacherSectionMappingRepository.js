import { Op } from 'sequelize';
import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';
import { requestContext } from '../utility/requestContext.js';

function teacherSubjectWhere(subjectIds) {
    if (subjectIds == null) {
        return {};
    }
    if (!subjectIds.length) {
        return { subjectId: -1 };
    }
    return { subjectId: { [Op.in]: subjectIds } };
}

function subjectInclude() {
    return {
        model: model.subjectModel,
        as: 'employeeSubject',
        attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
    };
}

async function findEmployeeInInstitute(employeeId) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
    });
}

async function findClassSectionInInstitute(classSectionsId) {
    return scoped(model.classSectionModel).findOne({
        where: { classSectionsId },
        attributes: ['classSectionsId'],
    });
}

async function findTeacherSectionMappingInInstitute(teacherSectionMappingId) {
    return scoped(model.teacherSectionMappingModel).findOne({
        where: { teacherSectionMappingId },
        attributes: ['teacherSectionMappingId', 'employeeId', 'classSectionsId'],
        include: [
            {
                model: model.employeeModel,
                as: 'employeeData',
                where: buildScope(model.employeeModel),
                required: true,
                attributes: ['employeeId'],
            },
            {
                model: model.classSectionModel,
                as: 'employeeSection',
                where: buildScope(model.classSectionModel),
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

        return await scoped(model.teacherSectionMappingModel).create(data);
    } catch (error) {
        console.error('Error in student mapping course:', error);
        throw error;
    }
}

export async function getTeacherSectionMapping({
    employeeId,
    sessionId,
    yearId,
    subjectIds,
    search,
    page = 1,
    limit = 20,
} = {}) {
    try {
        const universityId = requestContext.getStore()?.universityId;

        const classSectionWhere = {
            ...(yearId != null && { acedmicYearId: yearId }),
            ...(sessionId && { sessionId }),
            ...buildScope(model.classSectionModel),
        };
        const employeeWhere = buildScope(model.employeeModel);
        const courseWhere = buildScope(model.courseModel);

        const mappingWhere = {};
        if (employeeId) {
            mappingWhere.employeeId = employeeId;
        }

        const trimmedSearch = search?.trim();
        if (trimmedSearch) {
            const term = `%${trimmedSearch}%`;
            mappingWhere[Op.or] = [
                { '$employeeData.employee_name$': { [Op.like]: term } },
                { '$employeeData.employee_Code$': { [Op.like]: term } },
                { '$employeeSection.section$': { [Op.like]: term } },
                { '$employeeSection.employeeCourse.course_name$': { [Op.like]: term } },
                { '$employeeSection.employeeCourse.course_code$': { [Op.like]: term } },
                { '$employeeSection.classSession.session_name$': { [Op.like]: term } },
            ];
        }

        const employeeInclude = [
            {
                model: model.campusModel,
                as: 'employeeCampus',
                attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'campusId', 'campusCode'] },
                where: { universityId, ...buildScope(model.campusModel) },
                required: true,
            },
            {
                model: model.instituteModel,
                as: 'employeeInstitute',
                attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'campusId', 'instituteCode'] },
            },
        ];

        if (subjectIds != null) {
            employeeInclude.push({
                model: model.teacherSubjectMappingModel,
                as: 'teacherEmployeeData',
                required: false,
                attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                where: teacherSubjectWhere(subjectIds),
                include: [subjectInclude()],
            });
        }

        const include = [
            {
                model: model.userModel,
                as: 'userTeacherSectionMapping',
                attributes: ['universityId', 'userId'],
                where: { universityId, ...buildScope(model.userModel) },
                required: true,
            },
            {
                model: model.employeeModel,
                as: 'employeeData',
                attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                where: employeeWhere,
                required: true,
                include: employeeInclude,
            },
            {
                model: model.classSectionModel,
                as: 'employeeSection',
                attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                where: classSectionWhere,
                required: true,
                include: [
                    {
                        model: model.courseModel,
                        as: 'employeeCourse',
                        attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                        where: courseWhere,
                        required: true,
                    },
                    {
                        model: model.sessionModel,
                        as: 'classSession',
                        attributes: ['sessionId', 'sessionName', 'startingDate', 'endingDate', 'classTillDate'],
                        required: false,
                    },
                ],
            },
        ];

        const offset = (page - 1) * limit;
        const queryOptions = {
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            ...(Object.keys(mappingWhere).length && { where: mappingWhere }),
            include,
            offset,
            limit,
            order: [['teacherSectionMappingId', 'DESC']],
            ...(trimmedSearch && { subQuery: false }),
        };

        const result = await scoped(model.teacherSectionMappingModel).findAll(queryOptions);
        const totalCount = await scoped(model.teacherSectionMappingModel).count({
            ...(queryOptions.where && { where: queryOptions.where }),
            include,
            distinct: true,
            col: 'teacher_section_mapping_id',
            ...(trimmedSearch && { subQuery: false }),
        });

        return {
            result,
            totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
        };
    } catch (error) {
        console.error('Error in getting teacher section mapping:', error);
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

        return await scoped(model.teacherSectionMappingModel).update(info, {
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

        await scoped(model.teacherSectionMappingModel).destroy({
            where: { teacherSectionMappingId },
            individualHooks: true,
        });
        return { message: 'delete Teacher Section Mapping deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw error;
    }
}
