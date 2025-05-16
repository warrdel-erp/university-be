import * as attendanceService  from "../repository/attendanceRepository.js";

export async function addAttendance(attendanceData, createdBy, updatedBy) {
    
    try {
        // Prepare an array to hold the attendance records to be saved
        const attendanceRecords = attendanceData.attendance.map(attendance => ({
            ...attendance,
            classSectionsId: attendanceData.classSectionsId,
            timeTableCreateId: attendanceData.timeTableCreateId,
            date :attendanceData.date,
            createdBy,
            updatedBy,
        }));

        // Call the service to add all attendance records
        const addedAttendance = await attendanceService.addAttendance(attendanceRecords);
        return addedAttendance;
    } catch (error) {
        console.error('Error adding Attendance:', error);
        throw new Error('Unable to add Attendance');
    }
}


export async function getAttendanceDetails(universityId,acedmicYearId) {
    return await attendanceService.getAttendanceDetails(universityId,acedmicYearId);
}

export async function updateAttendance(attendanceId, record, updatedBy) {    
    try {
        
       
        record.updatedBy = updatedBy;
        const result = await attendanceService.updateAttendance(attendanceId, record);
        return result;
    } catch (error) {
        console.error(`Error updating Attendance:`, error);
        throw error;
    }
};