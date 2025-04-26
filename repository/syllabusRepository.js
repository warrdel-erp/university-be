import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addSyllabus(syllabusData) {   
    console.log(`>>>>>>>>>>>>>>syllabusData`,syllabusData);
    try {
        const result = await model.syllabusDetailsModel.create(syllabusData);
        return result;
    } catch (error) {
        console.error("Error in add Syllabus :", error);
        throw error;
    }
};

export async function addSyllabusDetails(syllabusData) {   
    console.log(`>>>>>>>>>>>>>>syllabusData`,syllabusData);
    try {
        const result = await model.syllabusDetailsModel.bulkCreate(syllabusData);
        return result;
    } catch (error) {
        console.error("Error in add Syllabus details:", error);
        throw error;
    }
};

export async function getSyllabusDetails(universityId) {
    try {
        const Syllabus = await model.SyllabusModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
        });

        return Syllabus;
    } catch (error) {
        console.error('Error fetching Syllabus details:', error);
        throw error;
    }
}


export async function getSingleSyllabusDetails(SyllabusId) {
    try {
        const Syllabus = await model.SyllabusModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { SyllabusId },
        });

        return Syllabus;
    } catch (error) {
        console.error('Error fetching Syllabus details:', error);
        throw error;
    }
}

export async function deleteSyllabus(SyllabusId) {
    const deleted = await model.SyllabusModel.destroy({ where: { SyllabusId: SyllabusId } });
    return deleted > 0;
}

export async function updateSyllabus(SyllabusId, syllabusData) {
    try {
        const result = await model.SyllabusModel.update(syllabusData, {
            where: { SyllabusId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Syllabus creation ${SyllabusId}:`, error);
        throw error; 
    }
}