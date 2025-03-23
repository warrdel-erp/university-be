import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addElectiveSubject(electiveSubjectData) {    
    try {
        const result = await model.electiveSubjectModel.create(electiveSubjectData);
        return result;
    } catch (error) {
        console.error("Error in add electiveSubject :", error);
        throw error;
    }
};

export async function getElectiveSubjectDetails(universityId) {
    try {
        const electiveSubject = await model.electiveSubjectModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
        });

        return electiveSubject;
    } catch (error) {
        console.error('Error fetching electiveSubject details:', error);
        throw error;
    }
}


export async function getSingleElectiveSubjectDetails(electiveSubjectId) {
    try {
        const electiveSubject = await model.electiveSubjectModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { electiveSubjectId },
        });

        return electiveSubject;
    } catch (error) {
        console.error('Error fetching electiveSubject details:', error);
        throw error;
    }
}

export async function deleteElectiveSubject(electiveSubjectId) {
    const deleted = await model.electiveSubjectModel.destroy({ where: { electiveSubjectId: electiveSubjectId } });
    return deleted > 0;
}

export async function updateElectiveSubject(electiveSubjectId, electiveSubjectData) {
    try {
        const result = await model.electiveSubjectModel.update(electiveSubjectData, {
            where: { electiveSubjectId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating electiveSubject creation ${electiveSubjectId}:`, error);
        throw error; 
    }
}