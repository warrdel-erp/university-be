import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addSyllabus(syllabusData) {   
    try {
        const result = await model.syllabusModel.create(syllabusData);
        return result;
    } catch (error) {
        console.error("Error in add Syllabus :", error);
        throw error;
    }
};

export async function addSyllabusDetails(syllabusData) {   
    try {
        const result = await model.syllabusDetailsModel.bulkCreate(syllabusData);
        return result;
    } catch (error) {
        console.error("Error in add Syllabus details:", error);
        throw error;
    }
};

export async function getSyllabusDetails(universityId,acedmicYearId,instituteId,role) {
    try {
        const Syllabus = await model.syllabusModel.findAll({
            where: {
                        ...(acedmicYearId && { acedmicYearId }),
                        ...(role === 'Head' && { instituteId })
                    },
            attributes: { 
                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
            },
            include: [
                {
                    model: model.instituteModel,
                    as: 'syllabusInstitute',  
                    attributes: ["instituteName", "instituteCode"] ,
                    include:[
                        {
                            model:model.campusModel,
                            as:'campues',
                            attributes: ["campusName", "campusCode"] ,
                        }
                    ]
                    
                },
                {
                    model: model.acedmicYearModel,
                    as: 'syllabusAcedmicYear',  
                    attributes:  ["yearTitle", "startingDate", "endingDate"] 
                },
                {
                    model:model.courseModel,
                    as:'syllabusCourse',
                    attributes:["courseName","courseCode"]
                },
                {
                    model:model.courseModel,
                    as:'syllabusCourse',
                    attributes:["courseName","courseCode"]
                },
                {
                    model:model.classSectionModel,
                    as:'syllabusClassSection',
                    attributes: { 
                        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
                    }                
                },
                {
                    model: model.syllabusDetailsModel,
                    as: 'syllabusDetails',  
                    attributes: { 
                        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
                    }
                },
            ]
        });
        return Syllabus;
    } catch (error) {
        console.error('Error fetching Syllabus with details:', error);
        throw error;
    }
};


export async function getSingleSyllabusDetails(SyllabusId) {
    try {
        const Syllabus = await model.syllabusDetailsModel.findOne({
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
    const deleted = await model.syllabusModel.destroy({ where: { SyllabusId: SyllabusId } });
    return deleted > 0;
}

export async function updateSyllabus(SyllabusId, syllabusData) {
    try {
        const result = await model.syllabusModel.update(syllabusData, {
            where: { SyllabusId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Syllabus creation ${SyllabusId}:`, error);
        throw error; 
    }
};

export async function courseAllSubject(courseId) {
    try {
        const Syllabus = await model.syllabusModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { courseId },
            include:[
                {
                    model:model.courseModel,
                    as:'syllabusCourse',
                    attributes:["courseName","courseCode"]
                },
                {
                    model: model.syllabusDetailsModel,
                    as: 'syllabusDetails',  
                    attributes: { 
                        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
                    },
                    include:[
                        {
                            model:model.subjectModel,
                            as:'syllabusSubject',
                            attributes: { 
                                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
                            },
                        }
                    ]
                },
            ]
        });

        return Syllabus;
    } catch (error) {
        console.error('Error fetching Syllabus details:', error);
        throw error;
    }
}