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
                // {
                //     model:model.courseModel,
                //     as:'syllabusCourse',
                //     attributes:["courseName","courseCode"]
                // },
                // {
                //     model:model.classSectionModel,
                //     as:'syllabusClassSection',
                //     attributes: { 
                //         exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
                //     }                
                // },
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

export async function courseAllSubject(courseId,sessionId,universityId) {
    try {
        const Syllabus = await model.syllabusModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy","institute_id","acedmic_year_id","course_id"] },
            where: { courseId,sessionId},
            include:[
                {
                    model:model.courseModel,
                    as:'syllabusCourse',
                    attributes:["courseName","courseCode"],
                    where:{universityId}
                },
                {
                    model: model.syllabusDetailsModel,
                    as: 'syllabusDetails',  
                    attributes: { 
                        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy","syllabus_id","subject_id"] 
                    },
                    include:[
                        {
                            model:model.subjectModel,
                            as:'syllabusSubject',
                            attributes: { 
                                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
                            },
                            // include:[
                            //     {
                            //         model:model.classSubjectMapperModel,
                            //         as:'subjects'
                            //     }
                            // ]
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
};

export async function addSyllabusUnit(syllabusData) {   
    try {
        const result = await model.syllabusUnitModel.bulkCreate(syllabusData);
        return result;
    } catch (error) {
        console.error("Error in add Syllabus unit :", error);
        throw error;
    }
};

export async function syllabusUnitGet(universityId, acedmicYearId, instituteId, role) {
    try {
        const excludedFields = ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"];

        const syllabusUnit = await model.syllabusUnitModel.findAll({
            where: {
                ...(acedmicYearId && { acedmicYearId }),
                ...(role === 'Head' && { instituteId }),
                ...(universityId && { universityId }),
            },
            attributes: { exclude: excludedFields },
            include: [
                {
                    model: model.instituteModel,
                    as: 'instituteUnit',
                    attributes: ["instituteName", "instituteCode"],
                },
                {
                    model: model.acedmicYearModel,
                    as: 'acedmicYearUnit',
                    attributes: ["yearTitle", "startingDate", "endingDate"],
                },
                {
                    model: model.sessionModel,
                    as: 'sessionUnit',
                    attributes: ["sessionName"],
                },
                {
                    model: model.semesterModel,
                    as: 'semesterUnit',
                    attributes: { exclude: excludedFields },
                },
                {
                    model: model.subjectModel,
                    as: 'subjectUnit',
                    attributes: { exclude: excludedFields },
                },
            ],
        });

        return syllabusUnit;
    } catch (error) {
        console.error('Error fetching syllabus unit with details:', error);
        throw error;
    }
};