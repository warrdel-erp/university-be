import * as model from '../models/index.js'
import { scoped } from '../utility/scoped.js';

const excludeMeta = ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'];

export async function addSection(SectionData) {
    try {
        return await scoped(model.sectionModel).create(SectionData);
    } catch (error) {
        console.error("Error in add Section :", error);
        throw error;
    }
}

export async function getSectionDetails() {
    try {
        return await scoped(model.sectionModel).findAll({
            attributes: { exclude: [...excludeMeta, 'universityId'] },
        });
    } catch (error) {
        console.error('Error fetching Section details:', error);
        throw error;
    }
}

export async function getSingleSectionDetails(sectionId) {
    try {
        return await scoped(model.sectionModel).findOne({
            attributes: { exclude: excludeMeta },
            where: { sectionId },
        });
    } catch (error) {
        console.error('Error fetching Section details:', error);
        throw error;
    }
}

export async function deleteSection(sectionId) {
    const deleted = await scoped(model.sectionModel).destroy({ where: { sectionId } });
    return deleted > 0;
}

export async function updateSection(sectionId, SectionData) {
    try {
        return await scoped(model.sectionModel).update(SectionData, {
            where: { sectionId }
        });
    } catch (error) {
        console.error(`Error updating Section creation ${sectionId}:`, error);
        throw error;
    }
}
