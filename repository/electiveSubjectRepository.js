import * as model from '../models/index.js'
import { scoped } from '../utility/scoped.js';

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

export async function getElectiveSubjectDetails(filter = {}) {
    try {
        return await scoped(model.electiveSubjectModel).findAll({
            where: { ...filter },
            attributes: { exclude: excludeMeta },
        });
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
        });
    } catch (error) {
        console.error('Error fetching electiveSubject details:', error);
        throw error;
    }
}

export async function getSingleElectiveSubjectByAcedmicId(acedmicYearId) {
    try {
        return await scoped(model.electiveSubjectModel).findAll({
            attributes: { exclude: excludeMeta },
            where: { acedmicYearId: parseInt(acedmicYearId, 10) },
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
