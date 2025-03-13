import * as model from '../models/index.js'
import sequelize from "../database/sequelizeConfig.js"; 
import { Op, fn } from 'sequelize';

export async function addAttendance(attendanceRecords) {   
     
    try {
        const result = await model.attendanceModel.bulkCreate(attendanceRecords);
        return result;
    } catch (error) {
        console.error("Error in adding attendance:", error);
        throw error;
    }
};

export async function getAttendanceDetails(universityId) {
    try {
        const bookDetails = await model.attendanceModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            include: [
                {
                    model: model.userModel,
                    as: "userAttendence",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model: model.classSectionModel,
                    as: "classAttendance",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy"] },
                },
                {
                    model: model.studentModel,
                    as: "studentAttendance",
                    // attributes :["name","author","publisher"]
                },
                // {
                //     model: model.timeTableCreateModel,
                //     as: "timeTableAttendance",
                //     // attributes :["name","author","publisher"]
                // }
            ]
        });

        return bookDetails;
    } catch (error) {
        console.error('Error fetching attendance details:', error);
        throw error;
    }
};

export async function updateAttendance(attendanceId, record) {
    try {
        const result = await model.attendanceModel.update(record, {
            where: { attendanceId },
        });
        return result; 
    } catch (error) {
        console.error(`Error updating attendance ${attendanceId}:`, error);
        throw error; 
    }
};