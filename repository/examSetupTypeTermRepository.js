import * as model from '../models/index.js';
import { Op } from 'sequelize';

export async function bulkCreateExamSetupTypeTerm(data) {
    try {
        const result = await model.examSetupTypeTermModel.bulkCreate(data);
        return result;
    } catch (error) {
        console.error("Error in bulkCreateExamSetupTypeTerm:", error);
        throw error;
    }
}

export async function deleteExamSetupTypeTerm(examSetupTypeTermId) {
    try {
        const deleted = await model.examSetupTypeTermModel.destroy({ where: { examSetupTypeTermId } });
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
            courseId: item.courseId
        }));

        return await model.examSetupTypeTermModel.findAll({
            where: {
                [Op.or]: conditions
            }
        });
    } catch (error) {
        console.error("Error in checkExistingExamSetupTypeTerms:", error);
        throw error;
    }
}
export async function checkExamSetupTypeTermUsage(examSetupTypeTermId) {
    try {
        const usage = await model.examScheduleModel.findOne({
            where: { examSetupTypeTermId }
        });
        return usage;
    } catch (error) {
        console.error("Error in checkExamSetupTypeTermUsage:", error);
        throw error;
    }
}
