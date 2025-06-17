import * as timeTableCreateRepository from '../repository/timeTablecreateRepository.js';
import { getSingleTimeTableById } from '../repository/timeTableRepository.js';
import { getTeacherDetailsByTeacherSubjectId } from '../repository/teacherSubjectMappingRepository.js';
import { getSingleFaculityLoadDetails, updateFaculityLoad,updateFaculityLoadByEmployeeId } from '../repository/faculityLoadRepository.js';
import sequelize from '../database/sequelizeConfig.js'; 

export async function addtimeTableCreate(data, createdBy, updatedBy) {    
    const transaction = await sequelize.transaction();

    try {
        data.createdBy = createdBy;
        data.updatedBy = updatedBy;

       const result =  await timeTableCreateRepository.addTimeTableCreate(data, transaction);

        await transaction.commit();
        return result
    } catch (error) {
        await transaction.rollback();
        throw error; 
    }
}


export async function gettimeTableCreateDetails(universityId){
    return await timeTableCreateRepository.getTimeTableCreateDetails(universityId)
};

export async function getSingletimeTableCreateDetails(courseId,universityId){
    return await timeTableCreateRepository.getSingleTimeTableCreateDetails(courseId,universityId)
};

export async function updateTimeTableCreate(TimeTableCreateId,info,updatedBy) {
    try {
        info.updatedBy = updatedBy;
        const data = await timeTableCreateRepository.updateTimeTableCreate(TimeTableCreateId, info);
        return data; 
    } catch (error) {
        console.error('Error updating faculity load:', error);
        throw new Error('Failed to update time table'); 
    }
};

export async function deleteTimeTableCreate(TimeTableCreateId){
    return await timeTableCreateRepository.deleteTimeTableCreate(TimeTableCreateId)
};

export async function addtimeTableMapping(data, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();
    let teacherSubjectData = null;

    try {
        const {
            timeTableNameId,
            timeTableCreateId,
            timeTableCreationId,
            employeeId,
            teacherSubjectMappingId,
            isSameTeacher,
            day,
            period
        } = data;

        console.log(`>>>>>>> timeTableCreationId: ${timeTableCreationId}`);

        // Fetch time table data
        const timeTableData = await getSingleTimeTableById(timeTableCreationId);
        if (!timeTableData || !timeTableData[0]) {
            throw new Error(`No timetable found for ID ${timeTableCreationId}`);
        }

        const periodLength = timeTableData[0]?.dataValues?.periodLength || 0;
        console.log(`>>>>>> periodLength: ${periodLength}`);

        if (teacherSubjectMappingId) {
            teacherSubjectData = await getTeacherDetailsByTeacherSubjectId(teacherSubjectMappingId);
            if (!teacherSubjectData || !teacherSubjectData[0]) {
                throw new Error(`No teacher-subject mapping found for ID ${teacherSubjectMappingId}`);
            }
            console.log(`>>>>>>>>>>> teacherSubjectData:`, teacherSubjectData);
        }

        const employeeIdData = teacherSubjectData
            ? teacherSubjectData[0].dataValues?.employeeId
            : employeeId;

        if (!employeeIdData) {
            throw new Error(`Employee ID is missing or invalid.`);
        }

        console.log(`>>>>>> employeeIdData: ${employeeIdData}`);

        // Fetch faculty load details
        const faculityLoad = await getSingleFaculityLoadDetails(employeeIdData);
        console.log(`>>>>>> faculityLoad:`, faculityLoad);

        if (!faculityLoad || !faculityLoad[0]) {
            throw new Error(`No faculty load record found for employee ID ${employeeIdData}`);
        }

        const faculityCurrentLoad = faculityLoad[0].dataValues?.currentLoad || 0;
        console.log(`>>>>>> faculityCurrentLoad: ${faculityCurrentLoad}`);

        const currentLoad = parseInt(faculityCurrentLoad) + periodLength || 0;
        console.log(`>>>>>> currentLoad: ${currentLoad}`);

        // Update faculty load
        await updateFaculityLoadByEmployeeId(
            employeeIdData,
            { currentLoad },
            transaction
        );

        // Set audit info
        data.createdBy = createdBy;
        data.updatedBy = updatedBy;

        // Add new timetable entry
        const result = await timeTableCreateRepository.addtimeTableMapping(data, transaction);

        // Commit transaction
        await transaction.commit();
        return result;

    } catch (error) {
        await transaction.rollback();

        // Log full error for debugging
        console.error(" Error in addtimeTableMapping:", error);

        // Throw a custom or original error
        throw new Error(`Failed to add timetable mapping: ${error.message}`);
    }
};

export async function gettimeTableMappingDetail(universityId){
    return await timeTableCreateRepository.getTimeTableMappingDetail(universityId)
};

export async function getSingletimeTableMappingDetail(courseId,universityId){
    return await timeTableCreateRepository.getSingleTimeTableCreateDetails(courseId,universityId)
};