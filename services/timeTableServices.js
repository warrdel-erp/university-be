import * as timeTableRepository from '../repository/timeTableRepository.js';
import * as model from '../models/index.js';
import * as academicGroupRepository from '../repository/academicGroupRepository.js';
import sequelize from '../database/sequelizeConfig.js';
import { formatQueryDate } from '../utility/helper.js';

function toDateOnlyString(value) {
    if (value == null || value === '') {
        return null;
    }
    if (typeof value === 'string') {
        const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
            return match[1];
        }
    }
    return formatQueryDate(value);
}

async function assertNoOverlappingCourseSessionDates({
    courseId,
    academicGroupScopeId,
    sessionId,
    startingDate,
    endingDate,
    excludeMapperId = null,
}) {
    const start = toDateOnlyString(startingDate);
    const end = toDateOnlyString(endingDate);

    if (!start || !end) {
        throw new Error('startingDate and endingDate are required');
    }
    if (start > end) {
        throw new Error('endingDate cannot be before startingDate');
    }

    const overlap = await timeTableRepository.findOverlappingStructureCourseMapping({
        courseId,
        academicGroupScopeId,
        sessionId,
        startingDate: start,
        endingDate: end,
        excludeMapperId,
    });

    if (overlap) {
        throw new Error(
            `Date range overlaps (${toDateOnlyString(overlap.startingDate)} to ${toDateOnlyString(overlap.endingDate)})`,
        );
    }

    return { start, end };
}

function shapeStructureVariantTree(structures) {
    const byId = new Map();
    const roots = [];

    for (const row of structures) {
        const plain = row.get({ plain: true });
        plain.variants = [];
        byId.set(plain.timeTableNameId, plain);
    }

    for (const structure of byId.values()) {
        const sourceId = structure.sourceTimeTableNameId;
        if (sourceId != null && byId.has(sourceId)) {
            byId.get(sourceId).variants.push(structure);
            continue;
        }
        roots.push(structure);
    }

    return roots;
}

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
    const structures = await timeTableRepository.getTimeTableStructures();
    return shapeStructureVariantTree(structures);
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
        const academicGroupScope = plain.academicGroupScope;

        const scopeCourse = academicGroupScope ? academicGroupScope.course : null;
        const scopeSession = academicGroupScope ? academicGroupScope.session : null;

        result.push({
            timetableStructureCourseMapperId: plain.timetableStructureCourseMapperId,
            timeTableNameId: plain.timeTableNameId,
            structureName: structure ? structure.name : null,
            maximumPeriod: structure ? structure.maximumPeriod : null,
            periodLength: structure ? structure.periodLength : null,
            periodGap: structure ? structure.periodGap : null,
            startingTime: structure ? structure.startingTime : null,
            weekOff: structure ? structure.weekOff : null,
            courseId: plain.courseId || (scopeCourse ? scopeCourse.courseId : null),
            courseName: course ? course.courseName : (scopeCourse ? scopeCourse.courseName : null),
            courseCode: course ? course.courseCode : (scopeCourse ? scopeCourse.courseCode : null),
            academicGroupScopeId: plain.academicGroupScopeId || null,
            academicGroupScopeTitle: academicGroupScope ? academicGroupScope.title : null,
            sessionId: plain.sessionId || (scopeSession ? scopeSession.sessionId : null),
            sessionName: session ? session.sessionName : (scopeSession ? scopeSession.sessionName : null),
            startingDate: plain.startingDate,
            endingDate: plain.endingDate,
        });
    }

    return result;
}

export async function getAllStructureScopeMappings(filters = {}) {
    return await getStructureMappingPrintData(filters);
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

    const { start, end } = await assertNoOverlappingCourseSessionDates({
        courseId: updates.courseId,
        sessionId: updates.sessionId,
        startingDate: updates.startingDate,
        endingDate: updates.endingDate,
        excludeMapperId: mapping.timetableStructureCourseMapperId,
    });
    updates.startingDate = start;
    updates.endingDate = end;

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
            && start > toDateOnlyString(bounds.minStartingDate)
        ) {
            throw new Error(
                `startingDate cannot be after the earliest routine startingDate (${toDateOnlyString(bounds.minStartingDate)})`,
            );
        }

        if (
            body.endingDate
            && bounds.maxEndingDate
            && end < toDateOnlyString(bounds.maxEndingDate)
        ) {
            throw new Error(
                `endingDate cannot be before the latest routine endingDate (${toDateOnlyString(bounds.maxEndingDate)})`,
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

    const isScopeMapping = Boolean(data.academicGroupScopeId);
    const isCourseMapping = Boolean(data.courseId);

    if (isScopeMapping && isCourseMapping) {
        throw new Error('Structure mapping can be for either courseId or academicGroupScopeId, not both');
    }

    let targetCourseId = null;
    let targetScopeId = null;
    let targetSessionId = data.sessionId;

    if (isScopeMapping) {
        const scope = await academicGroupRepository.getScopeById(data.academicGroupScopeId);
        if (!scope) {
            throw new Error('academicGroupScopeId not found');
        }
        targetScopeId = Number(data.academicGroupScopeId);
        if (targetSessionId == null && scope.sessionId) {
            targetSessionId = scope.sessionId;
        }
    } else if (isCourseMapping) {
        targetCourseId = Number(data.courseId);
    } else {
        throw new Error('Either courseId or academicGroupScopeId must be provided');
    }

    if (targetSessionId == null) {
        throw new Error('sessionId is required');
    }

    if (isScopeMapping) {
        const existingScopeMapping = await timeTableRepository.getStructureScopeMapping(
            data.timeTableNameId,
            targetScopeId,
            targetSessionId,
        );
        if (existingScopeMapping) {
            throw new Error('Group scope mapping already exists for this structure and session');
        }
    } else {
        const existingCourseMapping = await timeTableRepository.getStructureCourseMapping(
            data.timeTableNameId,
            targetCourseId,
            targetSessionId,
        );
        if (existingCourseMapping) {
            throw new Error('Course mapping already exists for this structure, course and session');
        }
    }

    const res = await assertNoOverlappingCourseSessionDates({
        academicGroupScopeId: targetScopeId,
        courseId: targetCourseId,
        sessionId: targetSessionId,
        startingDate: data.startingDate,
        endingDate: data.endingDate,
    });

    return timeTableRepository.addStructureCourseMapping({
        timeTableNameId: data.timeTableNameId,
        courseId: targetCourseId,
        academicGroupScopeId: targetScopeId,
        sessionId: targetSessionId,
        universityId: structure.universityId,
        instituteId: structure.instituteId,
        academicYearId: structure.academicYearId,
        startingDate: res.start,
        endingDate: res.end,
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

        const result = {
            timeTableNameId: newTimeTableNameId,
            name: newName,
            sourceTimeTableNameId: Number(sourceTimeTableNameId),
            maximumPeriod: plain.maximumPeriod,
            periods,
        };

        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function getTimetableListPrintData(filters = {}) {
    return await timeTableRepository.getTimetableListPrintRows(filters);
}

export async function getProgramsOverviewData(query, reqContext) {
    const filters = {};
    if (query.instituteId) {
        filters.instituteId = query.instituteId;
    }

    const rows = await timeTableRepository.getProgramsOverviewRows(filters);

    const result = [];
    const allSessionIds = new Set();

    rows.forEach((courseRow) => {
        const plain = courseRow.get({ plain: true });

        if (plain.courseSection) {
            plain.courseSection.forEach(sec => {
                if (sec.sessionId) allSessionIds.add(sec.sessionId);
            });
        }
        
        if (plain.academicGroupScopes) {
            plain.academicGroupScopes.forEach(scope => {
                if (scope.sessionId) allSessionIds.add(scope.sessionId);
            });
        }
        
        if (plain.timeTableCourse) {
            plain.timeTableCourse.forEach(routine => {
                if (routine.structureCourseMapping && routine.structureCourseMapping.sessionId) {
                    allSessionIds.add(routine.structureCourseMapping.sessionId);
                }
            });
        }
    });

    const sessionMap = {};
    if (allSessionIds.size > 0) {
        const sessions = await model.sessionModel.findAll({
            where: { sessionId: Array.from(allSessionIds) },
            attributes: ['sessionId', 'sessionName', 'startingDate', 'endingDate'],
            raw: true
        });
        sessions.forEach(s => sessionMap[s.sessionId] = s);
    }

    rows.forEach((courseRow) => {
        const plain = courseRow.get({ plain: true });

        const sessionIds = new Set();
        
        if (plain.courseSection) {
            plain.courseSection.forEach(sec => {
                if (sec.sessionId) sessionIds.add(sec.sessionId);
            });
        }
        
        if (plain.academicGroupScopes) {
            plain.academicGroupScopes.forEach(scope => {
                if (scope.sessionId) sessionIds.add(scope.sessionId);
            });
        }
        
        if (plain.timeTableCourse) {
            plain.timeTableCourse.forEach(routine => {
                if (routine.structureCourseMapping && routine.structureCourseMapping.sessionId) {
                    sessionIds.add(routine.structureCourseMapping.sessionId);
                }
            });
        }

        if (sessionIds.size === 0) {
            sessionIds.add(null);
        }

        sessionIds.forEach(sessionId => {
            let sectionsCount = 0;
            if (plain.courseSection) {
                sectionsCount = plain.courseSection.filter(sec => sec.sessionId === sessionId || (!sec.sessionId && !sessionId)).length;
            }

            let academicGroupsCount = 0;
            if (plain.academicGroupScopes) {
                academicGroupsCount = plain.academicGroupScopes.filter(scope => scope.sessionId === sessionId || (!scope.sessionId && !sessionId)).length;
            }

            let totalRoutines = 0;
            let publishedRoutines = 0;
            let draftRoutines = 0;
            let inProgressRoutines = 0;

            if (plain.timeTableCourse) {
                const sessionRoutines = plain.timeTableCourse.filter(routine => {
                    const rSessionId = routine.structureCourseMapping ? routine.structureCourseMapping.sessionId : null;
                    return rSessionId === sessionId || (!rSessionId && !sessionId);
                });
                
                totalRoutines = sessionRoutines.length;
                for (const routine of sessionRoutines) {
                    if (routine.isPublish) {
                        publishedRoutines++;
                    } else {
                        draftRoutines++;
                    }
                }
            }
            
            result.push({
                courseId: plain.courseId,
                courseName: plain.courseName,
                courseCode: plain.courseCode,
                sessionId: sessionId,
                session: sessionId ? sessionMap[sessionId] || null : null,
                sectionsCount,
                academicGroupsCount,
                totalRoutines,
                publishedRoutines,
                draftRoutines,
                inProgressRoutines,
            });
        });
    });

    return result;
}
