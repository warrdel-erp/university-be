import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addSchedule(scheduleData) {   
    console.log(`>>>>>scheduleData`,scheduleData)
    try {
        const result = await model.scheduleModel.create(scheduleData);
        return result;
    } catch (error) {
        console.error("Error in add Schedule :", error);
        throw error;
    }
};

export async function addScheduleDetails(scheduleData) {   
    try {
        const result = await model.scheduleModel.bulkCreate(scheduleData);
        return result;
    } catch (error) {
        console.error("Error in add Schedule details:", error);
        throw error;
    }
};

export async function getScheduleDetails(universityId,acedmicYearId,instituteId,role) {
    try {
        const Schedule = await model.ScheduleModel.findAll({
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
                    as: 'ScheduleInstitute',  
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
                    as: 'ScheduleAcedmicYear',  
                    attributes:  ["yearTitle", "startingDate", "endingDate"] 
                },
                {
                    model:model.courseModel,
                    as:'ScheduleCourse',
                    attributes:["courseName","courseCode"]
                },
                // {
                //     model:model.courseModel,
                //     as:'ScheduleCourse',
                //     attributes:["courseName","courseCode"]
                // },
                // {
                //     model:model.classSectionModel,
                //     as:'ScheduleClassSection',
                //     attributes: { 
                //         exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
                //     }                
                // },
                {
                    model: model.scheduleModel,
                    as: 'ScheduleDetails',  
                    attributes: { 
                        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
                    }
                },
            ]
        });
        return Schedule;
    } catch (error) {
        console.error('Error fetching Schedule with details:', error);
        throw error;
    }
};


export async function getSingleScheduleDetails(ScheduleId) {
    try {
        const Schedule = await model.scheduleModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { ScheduleId },
        });

        return Schedule;
    } catch (error) {
        console.error('Error fetching Schedule details:', error);
        throw error;
    }
}

export async function deleteSchedule(ScheduleId) {
    const deleted = await model.ScheduleModel.destroy({ where: { ScheduleId: ScheduleId } });
    return deleted > 0;
}

export async function updateSchedule(ScheduleId, scheduleData) {
    try {
        const result = await model.ScheduleModel.update(scheduleData, {
            where: { ScheduleId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Schedule creation ${ScheduleId}:`, error);
        throw error; 
    }
};

export async function courseAllSubject(courseId) {
    try {
        const Schedule = await model.ScheduleModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { courseId },
            include:[
                {
                    model:model.courseModel,
                    as:'ScheduleCourse',
                    attributes:["courseName","courseCode"]
                },
                {
                    model: model.scheduleModel,
                    as: 'ScheduleDetails',  
                    attributes: { 
                        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
                    },
                    include:[
                        {
                            model:model.subjectModel,
                            as:'ScheduleSubject',
                            attributes: { 
                                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
                            },
                        }
                    ]
                },
            ]
        });

        return Schedule;
    } catch (error) {
        console.error('Error fetching Schedule details:', error);
        throw error;
    }
};

export async function addScheduleUnit(scheduleData) {   
    try {
        const result = await model.ScheduleUnitModel.bulkCreate(scheduleData);
        return result;
    } catch (error) {
        console.error("Error in add Schedule unit :", error);
        throw error;
    }
};

export async function ScheduleUnitGet(universityId, acedmicYearId, instituteId, role) {
    try {
        const excludedFields = ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"];

        const ScheduleUnit = await model.ScheduleUnitModel.findAll({
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

        return ScheduleUnit;
    } catch (error) {
        console.error('Error fetching Schedule unit with details:', error);
        throw error;
    }
};