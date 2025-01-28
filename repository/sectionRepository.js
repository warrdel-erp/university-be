import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addSection(SectionData) {    
    try {
        const result = await model.sectionModel.create(SectionData);
        return result;
    } catch (error) {
        console.error("Error in add Section :", error);
        throw error;
    }
};

export async function getSectionDetails(universityId) {    
    try {
        const Section = await model.sectionModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","universityId"] },
            where: { universityId },
        });
        return Section;
    } catch (error) {
        console.error('Error fetching Section details:', error);
        throw error;
    }
}


export async function getSingleSectionDetails(sectionId) {
    try {
        const Section = await model.sectionModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { sectionId },
        });

        return Section;
    } catch (error) {
        console.error('Error fetching Section details:', error);
        throw error;
    }
}

export async function deleteSection(sectionId) {
    const deleted = await model.sectionModel.destroy({ where: { sectionId: sectionId } });
    return deleted > 0;
}

export async function updateSection(sectionId, SectionData) {
    try {
        const result = await model.sectionModel.update(SectionData, {
            where: { sectionId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Section creation ${sectionId}:`, error);
        throw error; 
    }
}