import * as model from '../models/index.js'
import { scoped, buildScope } from '../utility/scoped.js';
import { getAcademicYearId } from '../utility/requestContext.js';
import { Op } from 'sequelize';

const excludeMeta = ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'];

export async function addElectiveSubject(electiveSubjectData) {
    try {
        return await scoped(model.electiveSubjectModel).create(electiveSubjectData);
    } catch (error) {
        console.error('Error in add electiveSubject :', error);
        throw error;
    }
}

export async function addBulkElectiveSubject(electiveSubjectData, options = {}) {
    try {
        return await scoped(model.electiveSubjectModel).bulkCreate(electiveSubjectData, options);
    } catch (error) {
        console.error('Error in add electiveSubject :', error);
        throw error;
    }
}

export async function getElectiveSubjectDetails(options = {}) {
    try {
        const { page, limit, search } = options;
        const where = {};
        if (search && String(search).trim()) {
            const searchTerm = `%${String(search).trim()}%`;
            where[Op.or] = [
                { electiveSubjectName: { [Op.like]: searchTerm } },
                { electiveSubjectCode: { [Op.like]: searchTerm } },
            ];
        }

        const include = [
            {
                model: model.courseModel,
                as: 'course',
                attributes: ['courseId', 'courseName'],
                required: false,
            },
            {
                model: model.studentElectiveSubjectModel,
                as: 'studentMappings',
                attributes: ['studentElectiveSubjectId', 'studentId'],
                required: false,
            },
        ];

        if (page && limit) {
            const parsedPage = parseInt(page, 10) || 1;
            const parsedLimit = parseInt(limit, 10) || 10;
            const offset = (parsedPage - 1) * parsedLimit;

            const { count, rows } = await scoped(model.electiveSubjectModel).findAndCountAll({
                where,
                attributes: { exclude: excludeMeta },
                include,
                offset,
                limit: parsedLimit,
            });

            return {
                rows,
                total: count,
                page: parsedPage,
                limit: parsedLimit,
            };
        } else {
            const rows = await scoped(model.electiveSubjectModel).findAll({
                where,
                attributes: { exclude: excludeMeta },
                include,
            });
            return {
                rows,
                total: rows.length,
                page: 1,
                limit: rows.length || 10,
            };
        }
    } catch (error) {
        console.error('Error fetching electiveSubject details:', error);
        throw error;
    }
}

export async function getSingleElectiveSubjectDetails(electiveSubjectId) {
    try {
        return await scoped(model.electiveSubjectModel).findOne({
            attributes: { exclude: excludeMeta },
            where: { electiveSubjectId },
            include: [
                {
                    model: model.courseModel,
                    as: 'course',
                    attributes: ['courseId', 'courseName'],
                    required: false,
                },
                {
                    model: model.studentElectiveSubjectModel,
                    as: 'studentMappings',
                    attributes: ['studentElectiveSubjectId', 'studentId'],
                    required: false,
                },
            ],
        });
    } catch (error) {
        console.error('Error fetching electiveSubject details:', error);
        throw error;
    }
}

export async function getSingleElectiveSubjectByAcedmicId(academicYearId) {
    try {
        return await scoped(model.electiveSubjectModel).findAll({
            attributes: { exclude: excludeMeta },
            where: { academicYearId: parseInt(academicYearId, 10) },
        });
    } catch (error) {
        console.error('Error fetching electiveSubject details by acedmic Id:', error);
        throw error;
    }
}

export async function deleteElectiveSubject(electiveSubjectId) {
    const deleted = await scoped(model.electiveSubjectModel).destroy({
        where: { electiveSubjectId },
    });
    return deleted > 0;
}

export async function updateElectiveSubject(electiveSubjectId, electiveSubjectData) {
    try {
        return await scoped(model.electiveSubjectModel).update(electiveSubjectData, {
            where: { electiveSubjectId },
        });
    } catch (error) {
        console.error(`Error updating electiveSubject creation ${electiveSubjectId}:`, error);
        throw error;
    }
}

export async function getMappedStudentsForElective(electiveSubjectId, options = {}) {
    try {
        const { page = 1, limit = 10, search = '' } = options;
        const parsedPage = parseInt(page, 10) || 1;
        const parsedLimit = parseInt(limit, 10) || 10;
        const offset = (parsedPage - 1) * parsedLimit;

        const studentWhere = {};
        if (search && String(search).trim()) {
            const searchTerm = `%${String(search).trim()}%`;
            studentWhere[Op.or] = [
                { firstName: { [Op.like]: searchTerm } },
                { middleName: { [Op.like]: searchTerm } },
                { lastName: { [Op.like]: searchTerm } },
                { scholarNumber: { [Op.like]: searchTerm } },
                { enrollNumber: { [Op.like]: searchTerm } },
                { email: { [Op.like]: searchTerm } },
            ];
        }

        const { count, rows } = await scoped(model.studentElectiveSubjectModel).findAndCountAll({
            where: { electiveSubjectId: parseInt(electiveSubjectId, 10) },
            include: [
                {
                    model: model.studentModel,
                    as: 'student',
                    where: Object.keys(studentWhere).length > 0 ? studentWhere : undefined,
                    attributes: ['studentId', 'scholarNumber', 'enrollNumber', 'firstName', 'middleName', 'lastName', 'email', 'phoneNumber', 'courseId'],
                    include: [
                        {
                            model: model.courseModel,
                            as: 'course',
                            attributes: ['courseId', 'courseName'],
                            required: false,
                        },
                    ],
                },
            ],
            offset,
            limit: parsedLimit,
            order: [['student_elective_subject_id', 'DESC']],
        });

        return {
            data: rows,
            total: count,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: Math.ceil(count / parsedLimit) || 1,
        };
    } catch (error) {
        console.error('Error fetching mapped students for elective:', error);
        throw error;
    }
}

export async function getEligibleStudentsForElective(electiveSubjectId, options = {}) {
    try {
        const { page = 1, limit = 10, search = '' } = options;
        const parsedPage = parseInt(page, 10) || 1;
        const parsedLimit = parseInt(limit, 10) || 10;
        const offset = (parsedPage - 1) * parsedLimit;
        const academicYearId = getAcademicYearId();

        const electiveSubject = await scoped(model.electiveSubjectModel).findOne({
            where: { electiveSubjectId: parseInt(electiveSubjectId, 10) },
        });

        if (!electiveSubject) {
            throw new Error('Elective subject not found');
        }

        const currentMappings = await scoped(model.studentElectiveSubjectModel).findAll({
            where: { electiveSubjectId: parseInt(electiveSubjectId, 10) },
            attributes: ['studentId'],
        });

        const mappedStudentIds = currentMappings.map((m) => m.studentId);

        const whereClause = {
            ...(electiveSubject.courseId ? { courseId: electiveSubject.courseId } : {}),
            ...(mappedStudentIds.length > 0 ? { studentId: { [Op.notIn]: mappedStudentIds } } : {}),
        };

        if (search && String(search).trim()) {
            const searchTerm = `%${String(search).trim()}%`;
            whereClause[Op.or] = [
                { firstName: { [Op.like]: searchTerm } },
                { middleName: { [Op.like]: searchTerm } },
                { lastName: { [Op.like]: searchTerm } },
                { scholarNumber: { [Op.like]: searchTerm } },
                { enrollNumber: { [Op.like]: searchTerm } },
                { email: { [Op.like]: searchTerm } },
            ];
        }

        const includes = [
            {
                model: model.courseModel,
                as: 'course',
                attributes: ['courseId', 'courseName'],
                required: false,
            },
        ];

        if (academicYearId) {
            includes.push({
                model: model.studentClassSectionsHistoryModel,
                as: 'sectionHistory',
                where: { status: 'current' },
                required: true,
                include: [
                    {
                        model: model.classSectionModel,
                        as: 'classSection',
                        where: { academicYearId, ...buildScope(model.classSectionModel) },
                        required: true,
                    },
                ],
            });
        }

        const { count, rows } = await scoped(model.studentModel).findAndCountAll({
            where: whereClause,
            attributes: ['studentId', 'scholarNumber', 'enrollNumber', 'firstName', 'middleName', 'lastName', 'email', 'phoneNumber', 'courseId'],
            include: includes,
            subQuery: false,
            offset,
            limit: parsedLimit,
            order: [['student_id', 'DESC']],
        });

        return {
            data: rows,
            total: count,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: Math.ceil(count / parsedLimit) || 1,
        };
    } catch (error) {
        console.error('Error fetching eligible students for elective:', error);
        throw error;
    }
}

export async function mapStudentsToElective(electiveSubjectId, studentIds, createdBy) {
    try {
        const existingMappings = await scoped(model.studentElectiveSubjectModel).findAll({
            where: {
                electiveSubjectId: parseInt(electiveSubjectId, 10),
                studentId: studentIds,
            },
            attributes: ['studentId'],
        });

        const existingStudentIds = new Set(existingMappings.map((m) => m.studentId));
        const newStudentIds = studentIds.filter((id) => !existingStudentIds.has(id));

        if (newStudentIds.length === 0) {
            return { message: 'All selected students are already mapped' };
        }

        const recordsToCreate = newStudentIds.map((studentId) => ({
            electiveSubjectId: parseInt(electiveSubjectId, 10),
            studentId,
            createdBy,
        }));

        return await scoped(model.studentElectiveSubjectModel).bulkCreate(recordsToCreate);
    } catch (error) {
        console.error('Error mapping students to elective:', error);
        throw error;
    }
}

export async function unmapStudentFromElective(electiveSubjectId, studentId) {
    try {
        const deleted = await scoped(model.studentElectiveSubjectModel).destroy({
            where: {
                electiveSubjectId: parseInt(electiveSubjectId, 10),
                studentId: parseInt(studentId, 10),
            },
            force: true,
        });
        return deleted > 0;
    } catch (error) {
        console.error('Error unmapping student from elective:', error);
        throw error;
    }
}


