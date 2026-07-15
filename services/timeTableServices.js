import * as timeTableRepository from '../repository/timeTableRepository.js';
import sequelize from '../database/sequelizeConfig.js';

export async function addTimeTable(data, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();
    try {
        const structureItem = {
            name: data.name,
            maximumPeriod: data.maximumPeriod,
            courseId: data.courseId,
            periodLength: data.periodLength,
            periodGap: data.periodGap,
            startingTime: data.startingTime,
            startingDate: data.startingDate,
            endingDate: data.endingDate,
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

        if (data.type === 'Automatic') {
            const parseTime = (timeString) => {
                const [time, modifier] = timeString.split(' ');
                const [hour, minute] = time.split(':').map(Number);
                const adjustedHour = hour % 12 + (modifier === 'PM' ? 12 : 0);
                return new Date(1970, 0, 1, adjustedHour, minute);
            };

            let currentTime = parseTime(data.startingTime);
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

        if (!timeSlots.length) {
            throw new Error('No periods generated for this timetable structure');
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

export async function getAllTimeTableName(courseId) {
    return await timeTableRepository.getTimeTableStructures({ courseId });
}

export async function getTimeTableDetails(courseId) {
    return await timeTableRepository.getTimeTableStructures({ courseId });
}

export async function getSingleTimeTableDetails(courseId) {
    return await timeTableRepository.getTimeTableStructures({ courseId });
}

export async function updateTimeTable(info) {
    const results = [];
    for (const item of info) {
        const result = await timeTableRepository.updateTimeTable(item.timeTableCreationId, item);
        results.push(result);
    }
    return results;
}

export async function deleteTimeTable(timeTableCreationId) {
    return await timeTableRepository.deleteTimeTable(timeTableCreationId);
}

export async function deleteTimeTableStructure(timeTableNameId) {
    return await timeTableRepository.deleteTimeTableStructure(timeTableNameId);
}

export async function updateStructureEndingDate(timeTableNameId, endingDate, updatedBy) {
    return await timeTableRepository.updateStructureEndingDate(
        timeTableNameId,
        endingDate,
        updatedBy,
    );
}

function parseTimeString(timeString) {
    const [time, modifier] = timeString.split(' ');
    const [hour, minute] = time.split(':').map(Number);
    const adjustedHour = hour % 12 + (modifier === 'PM' ? 12 : 0);
    return new Date(1970, 0, 1, adjustedHour, minute);
}

function formatTimeString(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

export async function addTimeTablePeriod(data, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();
    try {
        const timeTableNameId = Number(data.timeTableNameId);
        const structure = await timeTableRepository.findStructureInScope(timeTableNameId, { transaction });
        if (!structure) {
            throw new Error('Time table structure not found for this institute and academic year');
        }

        const existingPeriods = await timeTableRepository.getStructurePeriodsByStructureId(
            timeTableNameId,
            { transaction },
        );
        const nextPeriodNumber = existingPeriods.length + 1;

        let lastPlain = null;
        if (existingPeriods.length > 0) {
            const lastPeriod = existingPeriods[existingPeriods.length - 1];
            lastPlain = lastPeriod.get ? lastPeriod.get({ plain: true }) : lastPeriod;
        }

        const type = data.type ?? lastPlain?.type ?? 'Manual';
        const isCourse = data.isCourse ?? lastPlain?.isCourse ?? false;
        const isBreak = data.isBreak ?? false;
        const periodName = data.periodName ?? `Period${nextPeriodNumber}`;

        let startTime = data.startTime;
        let endTime = data.endTime;
        const structurePlain = structure.get ? structure.get({ plain: true }) : structure;

        if (type === 'Automatic' && startTime == null && endTime == null) {
            const periodLength = structurePlain.periodLength;
            const periodGap = structurePlain.periodGap;
            if (periodLength == null || periodGap == null) {
                throw new Error(
                    'periodLength and periodGap are required on the structure for Automatic period generation',
                );
            }

            let currentTime;
            if (lastPlain?.endTime) {
                currentTime = parseTimeString(lastPlain.endTime);
                currentTime = new Date(currentTime.getTime() + periodGap * 60000);
            } else if (structurePlain.startingTime) {
                currentTime = parseTimeString(structurePlain.startingTime);
            } else {
                throw new Error(
                    'startingTime is required on the structure when adding the first Automatic period',
                );
            }

            const periodLengthMs = periodLength * 60000;
            startTime = formatTimeString(currentTime);
            endTime = formatTimeString(new Date(currentTime.getTime() + periodLengthMs));
        } else if (type === 'Manual') {
            if (startTime == null) {
                startTime = '';
            }
            if (endTime == null) {
                endTime = '';
            }
        }

        const periodRow = await timeTableRepository.addTimeTablePeriodRow(
            {
                timeTableNameId,
                type,
                periodName,
                startTime,
                endTime,
                isCourse,
                isBreak,
                createdBy,
                updatedBy,
            },
            transaction,
        );

        await timeTableRepository.incrementStructureMaximumPeriod(timeTableNameId, transaction);

        await transaction.commit();
        return periodRow;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
