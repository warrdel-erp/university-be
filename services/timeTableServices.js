import * as timeTableRepository from '../repository/timeTableRepository.js';
import sequelize from '../database/sequelizeConfig.js';
import { formatQueryDate } from '../utility/helper.js';

export async function addTimeTable(data, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();
    try {
        const structureItem = {
            name: data.name,
            maximumPeriod: data.maximumPeriod,
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

export async function getTimeTableDetails() {
    return await timeTableRepository.getTimeTableStructures();
}

export async function getAllTimeTableName(query = {}) {
    return await timeTableRepository.getTimeTableStructures({
        courseId: query.courseId,
        sessionId: query.sessionId,
    });
}

export async function getSingleTimeTableDetails(timeTableNameId) {
    const structure = await timeTableRepository.getTimeTableStructureDetailsById(timeTableNameId);
    if (!structure) {
        throw new Error('Time table structure not found for this institute and academic year');
    }
    return structure;
}

export async function getStructureMappingPrintData(filters = {}) {
    const rows = await timeTableRepository.getStructureMappingPrintRows(filters);
    const result = [];

    for (const row of rows) {
        const plain = row.get ? row.get({ plain: true }) : row;
        const structure = plain.timeTableStructure;
        const course = plain.course;
        const session = plain.session;

        result.push({
            timetableStructureCourseMapperId: plain.timetableStructureCourseMapperId,
            timeTableNameId: plain.timeTableNameId,
            structureName: structure.name,
            maximumPeriod: structure.maximumPeriod,
            periodLength: structure.periodLength,
            periodGap: structure.periodGap,
            startingTime: structure.startingTime,
            weekOff: structure.weekOff,
            courseId: plain.courseId,
            courseName: course.courseName,
            courseCode: course.courseCode,
            sessionId: plain.sessionId,
            sessionName: session.sessionName,
            startingDate: plain.startingDate,
            endingDate: plain.endingDate,
        });
    }

    return result;
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

export async function deleteTimeTableName(timeTableNameId) {
    return await timeTableRepository.deleteTimeTableName(timeTableNameId);
}

export async function deleteStructureCourseMapping(timetableStructureCourseMapperId) {
    return await timeTableRepository.deleteStructureCourseMappingById(
        timetableStructureCourseMapperId,
    );
}

export async function updateStructure(body, updatedBy) {
    const mapping = await timeTableRepository.getStructureCourseMappingById(
        body.timetableStructureCourseMapperId,
    );
    if (!mapping) {
        throw new Error('Course mapping not found');
    }

    const updates = {
        timeTableNameId: body.timeTableNameId ?? mapping.timeTableNameId,
        courseId: body.courseId ?? mapping.courseId,
        sessionId: body.sessionId ?? mapping.sessionId,
        startingDate: body.startingDate ?? mapping.startingDate,
        endingDate: body.endingDate ?? mapping.endingDate,
        updatedBy,
    };

    if (formatQueryDate(updates.endingDate) < formatQueryDate(updates.startingDate)) {
        throw new Error('endingDate cannot be before startingDate');
    }

    const structure = await timeTableRepository.getTimeTableStructureById(updates.timeTableNameId);
    if (!structure) {
        throw new Error('Time table structure not found for this institute and academic year');
    }

    if (
        updates.timeTableNameId !== mapping.timeTableNameId
        || updates.courseId !== mapping.courseId
        || updates.sessionId !== mapping.sessionId
    ) {
        const existing = await timeTableRepository.getStructureCourseMapping(
            updates.timeTableNameId,
            updates.courseId,
            updates.sessionId,
        );
        if (
            existing
            && existing.timetableStructureCourseMapperId !== mapping.timetableStructureCourseMapperId
        ) {
            throw new Error('Course mapping already exists for this structure, course and session');
        }
    }

    if (body.startingDate || body.endingDate) {
        const bounds = await timeTableRepository.getRoutineDateBoundsForMapper(
            mapping.timetableStructureCourseMapperId,
        );

        if (
            body.startingDate
            && bounds.minStartingDate
            && formatQueryDate(body.startingDate) > formatQueryDate(bounds.minStartingDate)
        ) {
            throw new Error(
                `startingDate cannot be after the earliest routine startingDate (${formatQueryDate(bounds.minStartingDate)})`,
            );
        }

        if (
            body.endingDate
            && bounds.maxEndingDate
            && formatQueryDate(body.endingDate) < formatQueryDate(bounds.maxEndingDate)
        ) {
            throw new Error(
                `endingDate cannot be before the latest routine endingDate (${formatQueryDate(bounds.maxEndingDate)})`,
            );
        }
    }

    return timeTableRepository.updateStructureCourseMappingById(
        mapping.timetableStructureCourseMapperId,
        updates,
        mapping.courseId,
    );
}

export async function addStructureCourseMapping(data, createdBy, updatedBy) {
    const structure = await timeTableRepository.getTimeTableStructureById(data.timeTableNameId);
    if (!structure) {
        throw new Error('Time table structure not found for this institute and academic year');
    }

    const existing = await timeTableRepository.getStructureCourseMapping(
        data.timeTableNameId,
        data.courseId,
        data.sessionId,
    );
    if (existing) {
        throw new Error('Course mapping already exists for this structure, course and session');
    }

    return timeTableRepository.addStructureCourseMapping({
        timeTableNameId: data.timeTableNameId,
        courseId: data.courseId,
        sessionId: data.sessionId,
        universityId: structure.universityId,
        instituteId: structure.instituteId,
        academicYearId: structure.academicYearId,
        startingDate: data.startingDate,
        endingDate: data.endingDate,
        createdBy,
        updatedBy,
    });
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

export async function cloneTimeTableStructure(sourceTimeTableNameId, name, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();

    try {
        const source = await timeTableRepository.getTimeTableStructureDetailsById(sourceTimeTableNameId);
        if (!source) {
            throw new Error('Structure not found');
        }

        const plain = source.get({ plain: true });
        const sourcePeriods = plain.timeTableName || [];
        const newName = name && name.trim() ? name.trim() : `Copy of ${plain.name}`;

        const newStructure = await timeTableRepository.addTimeTableName(
            {
                name: newName,
                maximumPeriod: plain.maximumPeriod,
                periodLength: plain.periodLength,
                periodGap: plain.periodGap,
                startingTime: plain.startingTime,
                weekOff: plain.weekOff,
                sourceTimeTableNameId: Number(sourceTimeTableNameId),
                createdBy,
                updatedBy,
            },
            transaction,
        );

        const newTimeTableNameId = newStructure.timeTableNameId;
        const timeSlots = [];

        for (const period of sourcePeriods) {
            timeSlots.push({
                timeTableNameId: newTimeTableNameId,
                periodName: period.periodName,
                startTime: period.startTime,
                endTime: period.endTime,
                type: period.type,
                isCourse: period.isCourse,
                isBreak: period.isBreak,
                createdBy,
                updatedBy,
            });
        }

        let periods = [];
        if (timeSlots.length) {
            periods = await timeTableRepository.addTimeTable({ timeSlots }, transaction);
        }

        await transaction.commit();

        return {
            timeTableNameId: newTimeTableNameId,
            name: newName,
            sourceTimeTableNameId: Number(sourceTimeTableNameId),
            maximumPeriod: plain.maximumPeriod,
            periods,
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
