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
    console.log(`>>>>>>>>>>data`,data);
    
    const transaction = await sequelize.transaction();

    try {
        
        const { timeTableNameId,timeTableCreateId,timeTableCreationId,employeeId,teacherSubjectMappingId,isSameTeacher,day, period} = data

        // Fetch time table data
        const timeTableData = await getSingleTimeTableById(timeTableCreationId);
        const periodLength = timeTableData[0].dataValues.periodLength;

        // Fetch teacher subject data
        const teacherSubjectData = await getTeacherDetailsByTeacherSubjectId(teacherSubjectMappingId);
        const employeeIdData = teacherSubjectData[0].dataValues.employeeId;

        // Fetch faculty load details
        const faculityLoad = await getSingleFaculityLoadDetails(employeeIdData);
        const faculityCurrentLoad = faculityLoad[0].dataValues.currentLoad || 0;
        const currentLoad = parseInt(faculityCurrentLoad) + periodLength;

        // Update faculty load
        await updateFaculityLoadByEmployeeId(employeeIdData, {currentLoad:currentLoad}, transaction );

        // // extra data 
        data.createdBy = createdBy;
        data.updatedBy = updatedBy;

        // Create new entry in time table entry
       const result =  await timeTableCreateRepository.addtimeTableMapping(data, transaction);

        // Commit the transaction
        await transaction.commit();
        return result
    } catch (error) {
        await transaction.rollback();
        throw error; 
    }
}


export async function gettimeTableMappingDetail(universityId){
    return await timeTableCreateRepository.getTimeTableMappingDetail(universityId)
};

export async function getSingletimeTableMappingDetail(courseId,universityId){
    return await timeTableCreateRepository.getSingletimeTableMappingDetail(courseId,universityId)
};