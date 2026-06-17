import * as timeTableRepository from '../repository/timeTableRepository.js';
import * as sessionRepository from '../repository/sessionRepository.js';
import * as model from '../models/index.js';
import sequelize from '../database/sequelizeConfig.js';

async function resolveTimeTableScope({
    courseId,
    sessionId,
    universityId,
    instituteId,
    acedmicYearId,
}) {
    const scope = {
        universityId,
        instituteId,
        acedmicYearId,
        sessionId,
    };

    if (courseId) {
        const course = await model.courseModel.findOne({
            where: { courseId, universityId },
            attributes: ["courseId", "instituteId", "universityId"],
        });
        if (!course) {
            throw new Error('Course not found');
        }
        scope.instituteId = course.instituteId;
    }

    if (sessionId) {
        const session = await model.sessionModel.findOne({
            where: { sessionId, universityId },
            attributes: ["sessionId", "acedmicYearId", "instituteId", "universityId"],
        });
        if (!session) {
            throw new Error('Session not found');
        }
        scope.acedmicYearId = session.acedmicYearId;

        if (courseId) {
            const isMapped = await sessionRepository.isSessionAlreadyMapped(
                sessionId,
                courseId,
                scope.instituteId,
                universityId
            );
            if (!isMapped) {
                throw new Error('Session is not mapped to this course');
            }
        }
    }

    if (courseId && !scope.acedmicYearId) {
        throw new Error('acedmicYearId or sessionId is required when courseId is provided');
    }

    return scope;
}

export async function addTimeTable(data, createdBy, updatedBy, universityId, instituteId, acedmicYearId) {
    const transaction = await sequelize.transaction();
    try {
        const scope = await resolveTimeTableScope({
            courseId: data.courseId,
            sessionId: data.sessionId,
            universityId,
            instituteId,
            acedmicYearId,
        });

        const structureItem = {
            name: data.name,
            maximumPeriod: data.maximumPeriod,
            courseId: data.courseId,
            sessionId: scope.sessionId,
            universityId: scope.universityId,
            instituteId: scope.instituteId,
            acedmicYearId: scope.acedmicYearId,
            periodLength: data.periodLength,
            periodGap: data.periodGap,
            startingTime: data.startingTime,
            weekOff: data.weekOff,
            createdBy,
            updatedBy,
        };

        const result = await timeTableRepository.addTimeTableName(structureItem, transaction);
        const timeTableNameId = result.dataValues.timeTableNameId;

        data.createdBy = createdBy;
        data.updatedBy = updatedBy;

        const timeSlots = [];
        const maxPeriods = data.maximumPeriod;

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
                    timeTableNameId,
                    type: data.type,
                    createdBy: data.createdBy,
                    updatedBy: data.updatedBy,
                    startTime: startPeriod,
                    endTime: endPeriod,
                    periodName,
                    isCourse: data.isCourse,
                });

                currentTime = new Date(currentTime.getTime() + periodLengthMs + periodGapMs);
            }
        } else if (data.type === 'Manual') {
            for (let i = 0; i < maxPeriods; i++) {
                const periodName = `Period${i + 1}`;
                timeSlots.push({
                    timeTableNameId,
                    type: data.type,
                    createdBy: data.createdBy,
                    updatedBy: data.updatedBy,
                    startTime: '',
                    endTime: '',
                    periodName,
                    isCourse: data.isCourse,
                });
            }
        }

        data.timeSlots = timeSlots;

        const timeTableEntry = await timeTableRepository.addTimeTable(data, transaction);

        await transaction.commit();
        return timeTableEntry;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function getAllTimeTableName(courseId, acedmicYearId, role, sessionId) {
    return await timeTableRepository.getTimeTableStructures(courseId, acedmicYearId, role, sessionId);
}

export async function getTimeTableDetails(acedmicYearId, role, courseId) {
    return await timeTableRepository.getTimeTableStructures(courseId, acedmicYearId, role);
}

export async function getSingleTimeTableDetails(courseId, acedmicYearId, role, sessionId) {
    return await timeTableRepository.getTimeTableStructures(courseId, acedmicYearId, role, sessionId);
}

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
}

export async function deleteTimeTable(timeTableCreationId) {
    return await timeTableRepository.deleteTimeTable(timeTableCreationId);
}
