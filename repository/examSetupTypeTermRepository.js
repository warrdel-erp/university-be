import * as model from '../models/index.js';
import { Op } from 'sequelize';
import { scoped } from '../utility/scoped.js';

export async function bulkCreateExamSetupTypeTerm(data) {
    try {
        const result = await scoped(model.examSetupTypeTermModel).bulkCreate(data);
        return result;
    } catch (error) {
        console.error("Error in bulkCreateExamSetupTypeTerm:", error);
        throw error;
    }
}

export async function deleteExamSetupTypeTerm(examSetupTypeTermId) {
    try {
        const existing = await scoped(model.examSetupTypeTermModel).findOne({
            where: { examSetupTypeTermId },
            attributes: ['examSetupTypeTermId'],
        });
        if (!existing) {
            return false;
        }
        const deleted = await scoped(model.examSetupTypeTermModel).destroy({ where: { examSetupTypeTermId } });
        return deleted > 0;
    } catch (error) {
        console.error("Error in deleteExamSetupTypeTerm:", error);
        throw error;
    }
}

export async function checkExistingExamSetupTypeTerms(data) {
    try {
        const conditions = data.map(item => ({
            examSetupTypeId: item.examSetupTypeId,
            term: item.term,
            courseId: item.courseId,
        }));

        return await scoped(model.examSetupTypeTermModel).findAll({
            where: {
                [Op.or]: conditions,
            },
        });
    } catch (error) {
        console.error("Error in checkExistingExamSetupTypeTerms:", error);
        throw error;
    }
}

export async function checkExamSetupTypeTermUsage(examSetupTypeTermId) {
    try {
        const usage = await scoped(model.examScheduleModel).findOne({
            where: { examSetupTypeTermId },
            attributes: ['examScheduleId'],
        });
        return usage;
    } catch (error) {
        console.error("Error in checkExamSetupTypeTermUsage:", error);
        throw error;
    }
}
