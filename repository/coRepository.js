import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

export async function addCo(coData) {
    try {
        return await scoped(model.coModel).create(coData);
    } catch (error) {
        console.error('Error in add co :', error);
        throw error;
    }
}

export async function getAllCo() {
    try {
        return await scoped(model.coModel).findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
            include: [
                {
                    model: model.syllabusDetailsModel.unscoped(),
                    as: 'cosyllabus',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                    include: [
                        {
                            model: model.subjectModel.unscoped(),
                            as: 'syllabusSubject',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error('Error fetching co details all:', error);
        throw error;
    }
}

export async function getSingleCoDetails(coId) {
    try {
        return await scoped(model.coModel).findOne({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
            where: { coId },
            include: [
                {
                    model: model.syllabusDetailsModel.unscoped(),
                    as: 'cosyllabus',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                    include: [
                        {
                            model: model.subjectModel.unscoped(),
                            as: 'syllabusSubject',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error('Error fetching co details:', error);
        throw error;
    }
}

export async function updateCo(coId, poData) {
    try {
        const existing = await scoped(model.coModel).findOne({
            where: { coId },
            attributes: ['coId'],
        });
        if (!existing) {
            return [0];
        }

        return await scoped(model.coModel).update(poData, {
            where: { coId },
        });
    } catch (error) {
        console.error(`Error updating co creation ${coId}:`, error);
        throw error;
    }
}

export async function deleteCo(coId) {
    const existing = await scoped(model.coModel).findOne({
        where: { coId },
        attributes: ['coId'],
    });
    if (!existing) {
        return false;
    }

    const deleted = await scoped(model.coModel).destroy({ where: { coId } });
    return deleted > 0;
}

export async function addCoWeightage(coData) {
    try {
        return await scoped(model.coWeightageModel).bulkCreate(coData);
    } catch (error) {
        console.error('Error in add weightage :', error);
        throw error;
    }
}

export async function getAllCoWeightage() {
    try {
        return await scoped(model.coWeightageModel).findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'universityId', 'instituteId'] },
            include: [
                {
                    model: model.coModel.unscoped(),
                    as: 'codetail',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'universityId', 'instituteId'] },
                    include: [
                        {
                            model: model.syllabusDetailsModel.unscoped(),
                            as: 'cosyllabus',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                            include: [
                                {
                                    model: model.subjectModel.unscoped(),
                                    as: 'syllabusSubject',
                                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error('Error fetching co weightage all:', error);
        throw error;
    }
}

export async function getSingleCoDetailsWeightage(coWeightageId) {
    try {
        return await scoped(model.coWeightageModel).findOne({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
            where: { coWeightageId },
            include: [
                {
                    model: model.coModel.unscoped(),
                    as: 'codetail',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                    include: [
                        {
                            model: model.syllabusDetailsModel.unscoped(),
                            as: 'cosyllabus',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                            include: [
                                {
                                    model: model.subjectModel.unscoped(),
                                    as: 'syllabusSubject',
                                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error('Error fetching co weightage:', error);
        throw error;
    }
}

export async function updateCoWeightage(coWeightageId, poData) {
    try {
        const existing = await scoped(model.coWeightageModel).findOne({
            where: { coWeightageId },
            attributes: ['coWeightageId'],
        });
        if (!existing) {
            return [0];
        }

        return await scoped(model.coWeightageModel).update(poData, {
            where: { coWeightageId },
        });
    } catch (error) {
        console.error(`Error updating co weightage ${coWeightageId}:`, error);
        throw error;
    }
}
