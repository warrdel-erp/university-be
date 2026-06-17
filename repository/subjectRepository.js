import * as model from '../models/index.js';
import sequelize from '../database/sequelizeConfig.js';
import { Op } from 'sequelize';

export async function getContactHoursSumBySubjectIds(subjectIds, tenantFilter) {
    if (!subjectIds.length) {
        return {};
    }

    const units = await model.syllabusUnitModel.findAll({
        where: {
            subjectId: { [Op.in]: subjectIds },
            ...tenantFilter,
        },
        attributes: ['subjectId', 'contactHours'],
        raw: true,
    });

    return units.reduce((sums, unit) => {
        const hours = parseFloat(unit.contactHours) || 0;
        sums[unit.subjectId] = (sums[unit.subjectId] || 0) + hours;
        return sums;
    }, {});
}

export async function getAllSubjects(filter) {
    try {
        const { universityId, instituteId, acedmicYearId, ...subjectFilter } = filter;

        const result = await model.subjectModel.findAll({
            where: { ...subjectFilter, universityId, instituteId, acedmicYearId },
            include: [
                {
                    model: model.courseModel,
                    as: 'courseInfo',
                    attributes: ['courseId', 'courseName']
                }
            ]
        });

        if (!result.length) {
            return result;
        }

        const subjectIds = result.map((subject) => subject.subjectId);
        const contactHoursBySubject = await getContactHoursSumBySubjectIds(subjectIds, {
            universityId,
            instituteId,
            acedmicYearId,
        });

        return result.map((subject) => {
            const plain = subject.toJSON();
            const totalContactHours = contactHoursBySubject[plain.subjectId] || 0;
            return {
                ...plain,
                contactHours: String(totalContactHours),
            };
        });
    } catch (error) {
        console.error("Error in getAllSubjects repository:", error);
        throw error;
    }
}



export async function setSubjectTerms(termsArray) {
    try {
        const subjectIds = termsArray.map(item => item.subjectId);

        // Check if any subject already has a term value
        const existingTerms = await model.subjectModel.findAll({
            where: {
                subjectId: subjectIds,
                term: { [Op.ne]: null }
            },
            attributes: ['subjectId', 'subjectCode']
        });

        if (existingTerms.length > 0) {
            const subjectCodes = existingTerms.map(s => s.subjectCode).join(', ');
            const error = new Error(`Cannot update terms. The following subjects already have term values: ${subjectCodes}`);
            error.statusCode = 400;
            throw error;
        }

        const t = await sequelize.transaction();
        try {
            for (const item of termsArray) {
                await model.subjectModel.update(
                    { term: item.term },
                    {
                        where: { subjectId: item.subjectId },
                        transaction: t
                    }
                );
            }
            await t.commit();
            return true;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error in setSubjectTerms repository:", error);
        throw error;
    }
}

export async function getSubjectById(id) {
    try {
        return await model.subjectModel.findByPk(id);
    } catch (error) {
        console.error("Error fetching subject by ID:", error);
        throw error;
    }
}
