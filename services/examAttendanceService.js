import * as examAttendanceRepository from "../repository/examAttendanceRepository.js";

export async function addExamAttendance(data, createdBy,updatedBy,instituteId) {
    const { examSetupId, studentId, attendanceStatus } = data;
    try {
        const newAttendance = {
            examSetupId,
            studentId,
            attendanceStatus,
            createdBy,
            updatedBy,
            instituteId,
        };
        return await examAttendanceRepository.createExamAttendance(newAttendance);
    } catch (error) {
        throw new Error(`Error creating exam attendance: ${error.message}`);
    }
};

export async function getAllExamAttendance(universityId,acedmicYearId,role,instituteId) {
    try {
        return await examAttendanceRepository.getAllExamAttendance(universityId,acedmicYearId,role,instituteId);
    } catch (error) {
        throw new Error(`Error fetching exam attendance records: ${error.message}`);
    }
};

export async function getSingleExamAttendance(examAttendanceId, universityId) {
    try {
        return await examAttendanceRepository.getSingleExamAttendance(
            examAttendanceId,
            universityId
        );
    } catch (error) {
        throw new Error(`Error fetching single exam attendance record: ${error.message}`);
    }
};

export async function updateExamAttendances(attendances, updatedBy) {
    try {
 
        const updates = attendances.map(record => ({
            ...record,
            updatedBy
        }));    
        const updatedRecords = await examAttendanceRepository.updateExamAttendances(updates);

        return updatedRecords;
    } catch (error) {
        throw new Error(`Error updating exam attendances: ${error.message}`);
    }
};

export async function deleteExamAttendance(examAttendanceId) {
    try {
        return await examAttendanceRepository.deleteExamAttendance(examAttendanceId);
    } catch (error) {
        throw new Error(`Error deleting exam attendance record: ${error.message}`);
    }
};