import * as model from '../models/index.js';
import sequelize from '../database/sequelizeConfig.js';
import { Op } from 'sequelize';

export async function getAllSubjects(universityId, acedmicYearId, campusId, instituteId, courseId) {
    try {
        const whereClause = {
            universityId,
            ...(acedmicYearId && { acedmicYearId }),
            ...(instituteId && { instituteId }),
            ...(campusId && { campusId }),
            ...(courseId && { courseId }),
        };

        const result = await model.subjectModel.findAll({
            where: whereClause,
            include: [
                {
                    model: model.courseModel,
                    as: 'courseInfo',
                    attributes: ['courseId', 'courseName']
                }
            ]
        });
        return result;
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
