import * as model from "../models/index.js";
import { Op } from "sequelize";

export async function checkIdsBelongToSameCourse(examSetupTypeTermId, subjectId, sessionId) {
    const term = await model.examSetupTypeTermModel.findByPk(examSetupTypeTermId, {
        attributes: ['courseId']
    });
    if (!term) throw new Error("Invalid examSetupTypeTermId");

    const subject = await model.subjectModel.findByPk(subjectId, {
        attributes: ['courseId']
    });
    if (!subject) throw new Error("Invalid subjectId");

    if (term.courseId !== subject.courseId) {
        throw new Error("examSetupTypeTermId and subjectId belong to different courses");
    }

    const sessionMapping = await model.sessionCouseMappingModel.findOne({
        where: {
            sessionId: sessionId,
            courseId: term.courseId
        }
    });

    if (!sessionMapping) {
        throw new Error("sessionId is not mapped to the course of the given term/subject");
    }

    return term.courseId;
}

export async function createOrUpdateWeightageBulk(dataList) {
    // For bulk, we can use bulkCreate with updateOnDuplicate
    return await model.subjectWeightageModel.bulkCreate(dataList, {
        updateOnDuplicate: ['weightage', 'sessionId', 'updatedBy', 'updatedAt']
    });
}

export async function getSubjectsWithWeightages(sessionId, examSetupTypeTermId) {
    const examSetupTypeTerm = await model.examSetupTypeTermModel.findByPk(examSetupTypeTermId, {
        attributes: ['courseId', 'term']
    });
    if (!examSetupTypeTerm) return [];

    return await model.subjectModel.findAll({
        where: {
            courseId: examSetupTypeTerm.courseId,
            term: examSetupTypeTerm.term
        },
        attributes: ['subjectId', 'subjectName', 'subjectCode', 'subjectType'],
        include: [
            {
                model: model.subjectWeightageModel,
                as: 'subjectWeightages',
                where: {
                    sessionId: sessionId,
                    examSetupTypeTermId: examSetupTypeTermId
                },
                required: false, // Left join to see all subjects even if no weightage
                attributes: ['subjectWeightageId', 'weightage']
            }
        ]
    });
}
