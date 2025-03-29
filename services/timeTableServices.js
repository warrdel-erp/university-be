import * as timeTableRepository from '../repository/timeTableRepository.js';
import sequelize from '../database/sequelizeConfig.js'; 

// export async function addTimeTable(data, createdBy, updatedBy) {

//     const transaction = await sequelize.transaction();
//     const name = data.name
    
//     const item = {name,createdBy,updatedBy}
//     const result = await timeTableRepository.addTimeTableName(item,transaction)
//     const timeTableNameId = result.dataValues.timeTableNameId;
//     // return
//     data.createdBy = createdBy;
//     data.updatedBy = updatedBy;

//     const timeSlots = [];
//     const maxPeriods = data.maximumPeriod; // Maximum number of periods

//     const parseTime = (timeString) => {
//         const [time, modifier] = timeString.split(' ');
//         const [hour, minute] = time.split(':').map(Number);
//         const adjustedHour = hour % 12 + (modifier === 'PM' ? 12 : 0);
//         return new Date(1970, 0, 1, adjustedHour, minute);
//     };

//     let startingTime = parseTime(data.startingTime);

//     if (data.type === 'Automatic') {
//         let currentTime = startingTime;
//         const periodLengthMs = data.periodLength * 60000;
//         const periodGapMs = data.periodGap * 60000;

//         for (let i = 0; i < maxPeriods; i++) {
//             const startPeriod = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
//             const endPeriod = new Date(currentTime.getTime() + periodLengthMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

//             timeSlots.push({
//                 // courseId: data.courseId,
//                 timeTableNameId:timeTableNameId,
//                 ApplicablePeriod: data.ApplicablePeriod,
//                 maximumPeriod: data.maximumPeriod,
//                 startingTime: data.startingTime,
//                 periodLength: data.periodLength,
//                 periodGap: data.periodGap,
//                 weekOff: data.weekOff,
//                 type: data.type,
//                 createdBy: data.createdBy,
//                 updatedBy: data.updatedBy,
//                 startTime: startPeriod,
//                 endTime: endPeriod
//             });

//             currentTime = new Date(currentTime.getTime() + periodLengthMs + periodGapMs);
//         }
//     } else if (data.type === 'Manual') {
//         for (let i = 0; i < maxPeriods; i++) {
//             const endPeriod = new Date(startingTime.getTime() + data.periodLength * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
//             timeSlots.push({
//                 timeTableNameId:timeTableNameId,
//                 ApplicablePeriod: data.ApplicablePeriod,
//                 maximumPeriod: data.maximumPeriod,
//                 startingTime: data.startingTime,
//                 periodLength: data.periodLength,
//                 periodGap: data.periodGap,
//                 weekOff: data.weekOff,
//                 type: data.type,
//                 createdBy: data.createdBy,
//                 updatedBy: data.updatedBy,
//                 startTime: '',
//                 endTime: '',
//             });
//             // Move the starting time for the next slot
//             startingTime = new Date(startingTime.getTime() + data.periodLength * 60000);
//         }

//         // Reset the other fields for manual entry
//         data.startingTime = '';
//         data.periodGap = '';
//     }

//     data.timeSlots = timeSlots;

//     return await timeTableRepository.addTimeTable(data,transaction);
// }            

export async function addTimeTable(data, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();
    try {
        const name = data.name;
        const item = { name, createdBy, updatedBy };
        const result = await timeTableRepository.addTimeTableName(item, transaction);
        const timeTableNameId = result.dataValues.timeTableNameId;

        // Return after adding timetable name
        data.createdBy = createdBy;
        data.updatedBy = updatedBy;

        const timeSlots = [];
        const maxPeriods = data.maximumPeriod; // Maximum number of periods

        const parseTime = (timeString) => {
            const [time, modifier] = timeString.split(' ');
            const [hour, minute] = time.split(':').map(Number);
            const adjustedHour = hour % 12 + (modifier === 'PM' ? 12 : 0);
            return new Date(1970, 0, 1, adjustedHour, minute);
        };

        let startingTime = parseTime(data.startingTime);

        if (data.type === 'Automatic') {
            let currentTime = startingTime;
            const periodLengthMs = data.periodLength * 60000;
            const periodGapMs = data.periodGap * 60000;

            for (let i = 0; i < maxPeriods; i++) {
                const startPeriod = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                const endPeriod = new Date(currentTime.getTime() + periodLengthMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                const periodName = `Period${i + 1}`;

                timeSlots.push({
                    courseId: data.courseId,
                    timeTableNameId: timeTableNameId,
                    ApplicablePeriod: data.ApplicablePeriod,
                    maximumPeriod: data.maximumPeriod,
                    startingTime: data.startingTime,
                    periodLength: data.periodLength,
                    periodGap: data.periodGap,
                    weekOff: data.weekOff,
                    type: data.type,
                    createdBy: data.createdBy,
                    updatedBy: data.updatedBy,
                    startTime: startPeriod,
                    endTime: endPeriod,
                    periodName: periodName,
                    isCourse : data.isCourse
                });

                currentTime = new Date(currentTime.getTime() + periodLengthMs + periodGapMs);
            }
        } else if (data.type === 'Manual') {
            for (let i = 0; i < maxPeriods; i++) {
                const endPeriod = new Date(startingTime.getTime() + data.periodLength * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                const periodName = `Period${i + 1}`;
                timeSlots.push({
                    courseId: data.courseId,
                    timeTableNameId: timeTableNameId,
                    ApplicablePeriod: data.ApplicablePeriod,
                    maximumPeriod: data.maximumPeriod,
                    startingTime: data.startingTime,
                    periodLength: data.periodLength,
                    periodGap: data.periodGap,
                    weekOff: data.weekOff,
                    type: data.type,
                    createdBy: data.createdBy,
                    updatedBy: data.updatedBy,
                    startTime: '',
                    endTime: '',
                    periodName: periodName,
                    isCourse : data.isCourse
                });
                // Move the starting time for the next slot
                startingTime = new Date(startingTime.getTime() + data.periodLength * 60000);
            }

            // Reset the other fields for manual entry
            data.startingTime = '';
            data.periodGap = '';
        }

        data.timeSlots = timeSlots;

        const timeTableEntry = await timeTableRepository.addTimeTable(data, transaction);

        await transaction.commit();
        return timeTableEntry
    } catch (error) {
        await transaction.rollback();
        throw error; 
    }
};

export async function getTimeTableDetails(){
    return await timeTableRepository.getTimeTableDetails()
};

export async function getSingleTimeTableDetails(courseId,universityId){
    return await timeTableRepository.getSingleTimeTableDetails(courseId,universityId)
};

export async function updateTimeTable(info) {
    try {
        const updatePromises = info.map(async (item) => {
            const timeTableCreationId = item.timeTableCreationId;
            return await timeTableRepository.updateTimeTable(timeTableCreationId, item);
        });

        const results = await Promise.all(updatePromises);
        return results; 
    } catch (error) {
        console.error('Error updating time table:', error);
        throw new Error('Failed to update time table'); 
    }
};

export async function deleteTimeTable(timeTableCreationId){
    return await timeTableRepository.deleteTimeTable(timeTableCreationId)
};