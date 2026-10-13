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

function parseDateOnly(dateStr) {
    if (typeof dateStr !== 'string') {
        dateStr = formatQueryDate(dateStr);
    }
    const match = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})/);
    const cleanStr = match ? match[1] : dateStr;
    const [y, m, d] = cleanStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

function formatDateOnly(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getNextDayString(dateStr) {
    const d = parseDateOnly(dateStr);
    d.setUTCDate(d.getUTCDate() + 1);
    return formatDateOnly(d);
}

export async function validateAndNormalizeVariantMappings({
    courseStart,
    courseEnd,
    rawVariants,
    timeTableNameId,
    structureVariants = null,
    transaction,
}) {
    const start = toDateOnlyString(courseStart);
    const end = toDateOnlyString(courseEnd);

    if (!start || !end) {
        throw new Error('Course startingDate and endingDate are required');
    }
    if (start > end) {
        throw new Error('Course endingDate cannot be before startingDate');
    }

    if (!Array.isArray(rawVariants) || rawVariants.length === 0) {
        throw new Error('At least one variant mapping is required');
    }

    const variantsList = structureVariants != null
        ? structureVariants
        : await timeTableRepository.findVariantsByStructureId(timeTableNameId, { transaction });
    const variantMap = new Map();
    for (const sv of variantsList) {
        const vPlain = sv.get ? sv.get({ plain: true }) : sv;
        variantMap.set(vPlain.timeTableStructureVariantId, vPlain);
    }

    const normalized = [];
    for (const item of rawVariants) {
        const vId = Number(item.timeTableStructureVariantId);
        if (!vId || isNaN(vId)) {
            throw new Error('timeTableStructureVariantId is required for each variant mapping');
        }
        if (!variantMap.has(vId)) {
            throw new Error(`Variant with ID ${vId} does not belong to timetable structure ${timeTableNameId}`);
        }
        const vStart = toDateOnlyString(item.startingDate);
        const vEnd = toDateOnlyString(item.endingDate);
        if (!vStart || !vEnd) {
            throw new Error(`startingDate and endingDate are required for variant ID ${vId}`);
        }
        if (vStart > vEnd) {
            const vName = variantMap.get(vId)?.name || `ID ${vId}`;
            throw new Error(`Variant '${vName}' startingDate (${vStart}) cannot be after endingDate (${vEnd})`);
        }
        normalized.push({
            timeTableStructureVariantId: vId,
            name: variantMap.get(vId)?.name || 'Regular',
            startingDate: vStart,
            endingDate: vEnd,
        });
    }

    // Sort variants chronologically by startingDate
    normalized.sort((a, b) => a.startingDate.localeCompare(b.startingDate));

    // 1. Course ki Date Range se Bahar Nahi Hona Chahiye
    for (const item of normalized) {
        if (item.startingDate < start) {
            throw new Error(
                `Variant '${item.name}' start date (${item.startingDate}) cannot be before course start date (${start})`,
            );
        }
        if (item.endingDate > end) {
            throw new Error(
                `Variant '${item.name}' end date (${item.endingDate}) cannot be after course end date (${end})`,
            );
        }
    }

    // 2. Complete Date Coverage: First variant must start on course start date
    if (normalized[0].startingDate !== start) {
        throw new Error(
            `Date gap detected: Course starts on ${start}, but first variant '${normalized[0].name}' starts on ${normalized[0].startingDate}`,
        );
    }

    // 3. Complete Date Coverage: Last variant must end on course end date
    const lastItem = normalized[normalized.length - 1];
    if (lastItem.endingDate !== end) {
        throw new Error(
            `Incomplete date coverage: Course ends on ${end}, but last variant '${lastItem.name}' ends on ${lastItem.endingDate}`,
        );
    }

    // 4. Consecutive mappings check: No overlaps and no gaps
    for (let i = 0; i < normalized.length - 1; i++) {
        const current = normalized[i];
        const next = normalized[i + 1];

        // Overlap Check
        if (next.startingDate <= current.endingDate) {
            throw new Error(
                `Date ranges overlap: Variant '${current.name}' (${current.startingDate} to ${current.endingDate}) overlaps with '${next.name}' (${next.startingDate} to ${next.endingDate})`,
            );
        }

        // Gap Check
        const expectedNextStart = getNextDayString(current.endingDate);
        if (next.startingDate !== expectedNextStart) {
            throw new Error(
                `Date gap detected: Missing date coverage between ${current.endingDate} and ${next.startingDate}`,
            );
        }
    }

    return normalized;
}

function shapeStructureVariantTree(structures) {
    const byId = new Map();
    const roots = [];

    for (const row of structures) {
        const plain = row.get ? row.get({ plain: true }) : row;
        plain.variants = [];
        byId.set(plain.timeTableNameId, plain);
    }

    for (const structure of byId.values()) {
        const sourceId = structure.sourceTimeTableNameId;
        if (sourceId != null && byId.has(sourceId)) {
            byId.get(sourceId).variants.push(structure);
            continue;
        }
        // If no cloned structures in variants, expose structureVariants in variants for backward compatibility
        if (structure.variants.length === 0 && structure.structureVariants && structure.structureVariants.length > 0) {
            structure.variants = structure.structureVariants;
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

        // Automatically create default 'Regular' variant
        const defaultVariant = await timeTableRepository.createStructureVariant({
            name: 'Regular',
            timeTableStructureId: timeTableNameId,
            isDefault: true,
            universityId: result.dataValues.universityId,
            instituteId: result.dataValues.instituteId,
            academicYearId: result.dataValues.academicYearId,
            createdBy,
            updatedBy,
        }, transaction);

        const defaultVariantId = defaultVariant.timeTableStructureVariantId || defaultVariant.dataValues?.timeTableStructureVariantId;

        // Link all newly created periods to the default variant
        const variantPeriods = timeTableEntry.map((period) => {
            const p = period.dataValues || period;
            return {
                timeTableStructureVariantId: defaultVariantId,
                timeTableStructurePeriodsId: p.timeTableCreationId,
                startTime: p.startTime,
                endTime: p.endTime,
                isCourse: p.isCourse ?? true,
                universityId: result.dataValues.universityId,
                instituteId: result.dataValues.instituteId,
                academicYearId: result.dataValues.academicYearId,
                createdBy,
                updatedBy,
            };
        });
        await timeTableRepository.bulkCreateVariantPeriods(variantPeriods, transaction);

        await transaction.commit();
        return timeTableEntry;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function getTimeTableDetails(query = {}) {
    const structures = await timeTableRepository.getTimeTableStructures({
        courseId: query.courseId,
        sessionId: query.sessionId,
    });
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

        const variantMappings = (plain.variantCourseMappings || []).map((vm) => ({
            id: vm.id,
            timeTableStructureVariantId: vm.timeTableStructureVariantId,
            name: vm.name,
            startingDate: vm.startingDate,
            endingDate: vm.endingDate,
        }));

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
            timeTableStructureVariantId: variantMappings[0]?.timeTableStructureVariantId || null,
            variantName: variantMappings.map((v) => v.name).filter(Boolean).join(', ') || null,
            variants: variantMappings,
        });
    }

    return result;
}

export async function getAllStructureScopeMappings(filters = {}) {
    return await getStructureMappingPrintData(filters);
}


export async function updateTimeTable(info, variantId = null) {
    const results = [];
    for (const item of info) {
        if (!variantId) {
            const result = await timeTableRepository.updateTimeTable(item.timeTableCreationId, item);
            results.push(result);
        }

        const periodUpdates = {};
        if (item.startTime !== undefined) periodUpdates.startTime = item.startTime;
        if (item.endTime !== undefined) periodUpdates.endTime = item.endTime;
        if (item.isCourse !== undefined) periodUpdates.isCourse = item.isCourse;

        if (Object.keys(periodUpdates).length > 0) {
            if (variantId) {
                const res = await timeTableRepository.updateVariantPeriodRow(
                    variantId,
                    item.timeTableCreationId,
                    periodUpdates,
                );
                results.push(res);
            } else {
                await model.timeTableStructureVariantPeriodsModel.update(periodUpdates, {
                    where: { timeTableStructurePeriodsId: item.timeTableCreationId },
                });
            }
        }
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
        academicGroupScopeId: mapping.academicGroupScopeId,
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

    const transaction = await sequelize.transaction();
    try {
        const result = await timeTableRepository.updateStructureCourseMappingById(
            mapping.timetableStructureCourseMapperId,
            updates,
            mapping.courseId,
            { transaction },
        );

        if (Array.isArray(body.variants) && body.variants.length > 0) {
            const validatedVariants = await validateAndNormalizeVariantMappings({
                courseStart: start,
                courseEnd: end,
                rawVariants: body.variants,
                timeTableNameId: updates.timeTableNameId,
                transaction,
            });

            await timeTableRepository.deleteVariantCourseMappingsByMapperId(
                mapping.timetableStructureCourseMapperId,
                transaction,
            );

            const variantRows = validatedVariants.map((v) => ({
                timetableStructureCourseMapperId: mapping.timetableStructureCourseMapperId,
                timeTableStructureVariantId: v.timeTableStructureVariantId,
                name: v.name,
                startingDate: v.startingDate,
                endingDate: v.endingDate,
                universityId: structure.universityId,
                instituteId: structure.instituteId,
                academicYearId: structure.academicYearId,
                createdBy: updatedBy,
                updatedBy,
            }));

            await timeTableRepository.bulkCreateVariantCourseMappings(variantRows, transaction);
        } else if (body.timeTableStructureVariantId) {
            const singleVariant = await timeTableRepository.findVariantById(body.timeTableStructureVariantId, { transaction });
            if (!singleVariant) {
                throw new Error(`Variant with ID ${body.timeTableStructureVariantId} not found`);
            }
            await timeTableRepository.deleteVariantCourseMappingsByMapperId(
                mapping.timetableStructureCourseMapperId,
                transaction,
            );
            await timeTableRepository.createVariantCourseMapping(
                {
                    timetableStructureCourseMapperId: mapping.timetableStructureCourseMapperId,
                    timeTableStructureVariantId: Number(body.timeTableStructureVariantId),
                    name: singleVariant.name || 'Regular',
                    startingDate: start,
                    endingDate: end,
                    universityId: structure.universityId,
                    instituteId: structure.instituteId,
                    academicYearId: structure.academicYearId,
                    createdBy: updatedBy,
                    updatedBy,
                },
                transaction,
            );
        } else if (body.startingDate || body.endingDate) {
            const existingVariants = await timeTableRepository.findVariantCourseMappingsByMapperId(
                mapping.timetableStructureCourseMapperId,
                { transaction },
            );
            if (existingVariants.length === 1) {
                await timeTableRepository.updateVariantCourseMappingByMapperId(
                    mapping.timetableStructureCourseMapperId,
                    {
                        startingDate: start,
                        endingDate: end,
                        updatedBy,
                    },
                    transaction,
                );
            }
        }

        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
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

    const sessionExists = await model.sessionModel.findByPk(targetSessionId);
    if (!sessionExists) {
        throw new Error(`Session with id ${targetSessionId} does not exist in the database`);
    }

    if (isCourseMapping) {
        const courseExists = await model.courseModel.findByPk(targetCourseId);
        if (!courseExists) {
            throw new Error(`Course with id ${targetCourseId} does not exist in the database`);
        }
    }

    let existingMapping = null;
    if (isScopeMapping) {
        existingMapping = await timeTableRepository.getStructureScopeMapping(
            data.timeTableNameId,
            targetScopeId,
            targetSessionId,
        );
    } else {
        existingMapping = await timeTableRepository.getStructureCourseMapping(
            data.timeTableNameId,
            targetCourseId,
            targetSessionId,
        );
    }

    const excludeMapperId = existingMapping ? existingMapping.timetableStructureCourseMapperId : null;
    const res = await assertNoOverlappingCourseSessionDates({
        academicGroupScopeId: targetScopeId,
        courseId: targetCourseId,
        sessionId: targetSessionId,
        startingDate: data.startingDate,
        endingDate: data.endingDate,
        excludeMapperId,
    });

    let rawVariants = data.variants;
    if (!Array.isArray(rawVariants) || rawVariants.length === 0) {
        let singleVariantId = data.timeTableStructureVariantId;
        if (!singleVariantId) {
            const defaultVariant = await timeTableRepository.findDefaultVariantByStructureId(data.timeTableNameId);
            if (defaultVariant) {
                singleVariantId = defaultVariant.timeTableStructureVariantId;
            }
        }
        if (!singleVariantId) {
            const anyVariants = await timeTableRepository.findVariantsByStructureId(data.timeTableNameId);
            if (anyVariants && anyVariants.length > 0) {
                singleVariantId = anyVariants[0].timeTableStructureVariantId;
            }
        }
        if (!singleVariantId) {
            throw new Error('No timetable structure variant found for this structure');
        }
        rawVariants = [
            {
                timeTableStructureVariantId: singleVariantId,
                startingDate: res.start,
                endingDate: res.end,
            },
        ];
    }

    const validatedVariants = await validateAndNormalizeVariantMappings({
        courseStart: res.start,
        courseEnd: res.end,
        rawVariants,
        timeTableNameId: data.timeTableNameId,
    });

    const transaction = await sequelize.transaction();
    try {
        let mapping;
        if (existingMapping) {
            mapping = existingMapping;
            await timeTableRepository.updateStructureCourseMappingById(
                mapping.timetableStructureCourseMapperId,
                {
                    startingDate: res.start,
                    endingDate: res.end,
                    updatedBy,
                },
                mapping.courseId,
                { transaction },
            );
            await timeTableRepository.deleteVariantCourseMappingsByMapperId(
                mapping.timetableStructureCourseMapperId,
                transaction,
            );
        } else {
            mapping = await timeTableRepository.addStructureCourseMapping(
                {
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
                },
                transaction,
            );
        }

        const mapperId = mapping.timetableStructureCourseMapperId;

        const variantRows = validatedVariants.map((v) => ({
            timetableStructureCourseMapperId: mapperId,
            timeTableStructureVariantId: v.timeTableStructureVariantId,
            name: v.name,
            startingDate: v.startingDate,
            endingDate: v.endingDate,
            universityId: structure.universityId,
            instituteId: structure.instituteId,
            academicYearId: structure.academicYearId,
            createdBy,
            updatedBy,
        }));

        await timeTableRepository.bulkCreateVariantCourseMappings(variantRows, transaction);

        await transaction.commit();

        const plainMapping = mapping.get ? mapping.get({ plain: true }) : { ...mapping };
        plainMapping.startingDate = res.start;
        plainMapping.endingDate = res.end;
        plainMapping.variants = validatedVariants;
        return plainMapping;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
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

        // Sync new period with all existing variants of this structure
        const variants = await timeTableRepository.findVariantsByStructureId(timeTableNameId, { transaction });
        if (variants && variants.length > 0) {
            const variantPeriods = variants.map((v) => ({
                timeTableStructureVariantId: v.timeTableStructureVariantId,
                timeTableStructurePeriodsId: periodRow.timeTableCreationId,
                startTime: periodRow.startTime,
                endTime: periodRow.endTime,
                isCourse: periodRow.isCourse ?? true,
                universityId: v.universityId,
                instituteId: v.instituteId,
                academicYearId: v.academicYearId,
                createdBy,
                updatedBy,
            }));
            await timeTableRepository.bulkCreateVariantPeriods(variantPeriods, transaction);
        }

        await timeTableRepository.incrementStructureMaximumPeriod(timeTableNameId, transaction);

        await transaction.commit();
        return periodRow;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function addTimeTableVariant(data, createdBy, updatedBy) {
    const structure = await timeTableRepository.getTimeTableStructureById(data.timeTableNameId);
    if (!structure) {
        throw new Error('Time table structure not found for this institute and academic year');
    }

    const transaction = await sequelize.transaction();

    try {
        if (data.isDefault) {
            await model.timeTableStructureVariantModel.update(
                { isDefault: false },
                {
                    where: { timeTableStructureId: Number(data.timeTableNameId) },
                    transaction,
                },
            );
        }

        const variant = await timeTableRepository.createStructureVariant(
            {
                name: data.name,
                timeTableStructureId: Number(data.timeTableNameId),
                isDefault: Boolean(data.isDefault),
                universityId: structure.universityId,
                instituteId: structure.instituteId,
                academicYearId: structure.academicYearId,
                createdBy,
                updatedBy,
            },
            transaction,
        );

        const variantId = variant.timeTableStructureVariantId;
        const variantPeriods = [];

        if (Array.isArray(data.periods) && data.periods.length > 0) {
            for (const p of data.periods) {
                variantPeriods.push({
                    timeTableStructureVariantId: variantId,
                    timeTableStructurePeriodsId: Number(p.timeTableStructurePeriodsId),
                    startTime: p.startTime || '',
                    endTime: p.endTime || '',
                    isCourse: p.isCourse ?? true,
                    universityId: structure.universityId,
                    instituteId: structure.instituteId,
                    academicYearId: structure.academicYearId,
                    createdBy,
                    updatedBy,
                });
            }
        } else {
            const basePeriods = await timeTableRepository.getStructurePeriodsByStructureId(
                data.timeTableNameId,
                { transaction },
            );
            for (const bp of basePeriods) {
                const plain = bp.get ? bp.get({ plain: true }) : bp;
                variantPeriods.push({
                    timeTableStructureVariantId: variantId,
                    timeTableStructurePeriodsId: plain.timeTableCreationId,
                    startTime: plain.startTime || '',
                    endTime: plain.endTime || '',
                    isCourse: plain.isCourse ?? true,
                    universityId: structure.universityId,
                    instituteId: structure.instituteId,
                    academicYearId: structure.academicYearId,
                    createdBy,
                    updatedBy,
                });
            }
        }

        let createdPeriods = [];
        if (variantPeriods.length > 0) {
            createdPeriods = await timeTableRepository.bulkCreateVariantPeriods(variantPeriods, transaction);
        }

        await transaction.commit();

        return {
            timeTableStructureVariantId: variantId,
            timeTableStructureId: Number(data.timeTableNameId),
            name: data.name,
            isDefault: Boolean(data.isDefault),
            variantPeriods: createdPeriods,
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function deleteTimeTableVariant(timeTableStructureVariantId) {
    const variantId = Number(timeTableStructureVariantId);
    if (!variantId || isNaN(variantId)) {
        throw new Error('Valid timeTableStructureVariantId is required');
    }

    const variant = await timeTableRepository.findVariantById(variantId);
    if (!variant) {
        throw new Error('Time table structure variant not found for this institute and academic year');
    }

    const plain = variant.get ? variant.get({ plain: true }) : variant;
    if (plain.isDefault) {
        throw new Error('Default variant cannot be deleted. Every structure must have at least one default variant.');
    }

    const mappedCourse = await timeTableRepository.findVariantCourseMappingByVariantId(variantId);
    if (mappedCourse) {
        throw new Error('Variant is mapped to a course or academic group schedule and cannot be deleted');
    }

    const transaction = await sequelize.transaction();
    try {
        await timeTableRepository.deleteVariantById(variantId, transaction);
        await transaction.commit();

        return {
            message: `Time table variant deleted successfully for variant ID ${variantId}`,
            timeTableStructureVariantId: variantId,
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function cloneTimeTableStructure(sourceTimeTableNameId, name, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();

    try {
        const source = await timeTableRepository.getTimeTableStructureDetailsById(sourceTimeTableNameId, {
            transaction,
        });
        if (!source) {
            throw new Error('Structure not found');
        }

        const plain = source.get ? source.get({ plain: true }) : source;
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
                sourceTimeTableNameId: null,
                createdBy,
                updatedBy,
            },
            transaction,
        );

        const newTimeTableNameId = newStructure.timeTableNameId;
        const universityId = newStructure.universityId || newStructure.dataValues?.universityId;
        const instituteId = newStructure.instituteId || newStructure.dataValues?.instituteId;
        const academicYearId = newStructure.academicYearId || newStructure.dataValues?.academicYearId;

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

        let newPeriods = [];
        if (timeSlots.length) {
            newPeriods = await timeTableRepository.addTimeTable({ timeSlots }, transaction);
        }

        const periodIdMap = new Map();
        for (let i = 0; i < sourcePeriods.length; i++) {
            const oldId = sourcePeriods[i].timeTableCreationId;
            const newPeriodInstance = newPeriods[i];
            const newId = newPeriodInstance?.timeTableCreationId || newPeriodInstance?.dataValues?.timeTableCreationId;
            if (oldId && newId) {
                periodIdMap.set(oldId, newId);
            }
        }

        const sourceVariants = await timeTableRepository.findVariantsByStructureId(sourceTimeTableNameId, {
            transaction,
        });

        const clonedVariants = [];

        if (sourceVariants && sourceVariants.length > 0) {
            for (const sv of sourceVariants) {
                const svPlain = sv.get ? sv.get({ plain: true }) : sv;
                const newVariant = await timeTableRepository.createStructureVariant(
                    {
                        name: svPlain.name,
                        timeTableStructureId: newTimeTableNameId,
                        isDefault: Boolean(svPlain.isDefault),
                        universityId,
                        instituteId,
                        academicYearId,
                        createdBy,
                        updatedBy,
                    },
                    transaction,
                );

                const newVariantId = newVariant.timeTableStructureVariantId || newVariant.dataValues?.timeTableStructureVariantId;

                const svPeriods = svPlain.variantPeriods || [];
                const variantPeriodsToCreate = [];

                if (svPeriods.length > 0) {
                    for (const vp of svPeriods) {
                        const vpPlain = vp.get ? vp.get({ plain: true }) : vp;
                        const mappedNewPeriodId = periodIdMap.get(vpPlain.timeTableStructurePeriodsId);
                        if (mappedNewPeriodId) {
                            variantPeriodsToCreate.push({
                                timeTableStructureVariantId: newVariantId,
                                timeTableStructurePeriodsId: mappedNewPeriodId,
                                startTime: vpPlain.startTime,
                                endTime: vpPlain.endTime,
                                isCourse: vpPlain.isCourse ?? true,
                                universityId,
                                instituteId,
                                academicYearId,
                                createdBy,
                                updatedBy,
                            });
                        }
                    }
                }

                if (variantPeriodsToCreate.length === 0 && newPeriods.length > 0) {
                    for (const np of newPeriods) {
                        const npVal = np.dataValues || np;
                        variantPeriodsToCreate.push({
                            timeTableStructureVariantId: newVariantId,
                            timeTableStructurePeriodsId: npVal.timeTableCreationId,
                            startTime: npVal.startTime,
                            endTime: npVal.endTime,
                            isCourse: npVal.isCourse ?? true,
                            universityId,
                            instituteId,
                            academicYearId,
                            createdBy,
                            updatedBy,
                        });
                    }
                }

                let createdVPeriods = [];
                if (variantPeriodsToCreate.length > 0) {
                    createdVPeriods = await timeTableRepository.bulkCreateVariantPeriods(
                        variantPeriodsToCreate,
                        transaction,
                    );
                }

                clonedVariants.push({
                    timeTableStructureVariantId: newVariantId,
                    name: svPlain.name,
                    isDefault: Boolean(svPlain.isDefault),
                    variantPeriods: createdVPeriods,
                });
            }
        } else {
            const defaultVariant = await timeTableRepository.createStructureVariant(
                {
                    name: 'Regular',
                    timeTableStructureId: newTimeTableNameId,
                    isDefault: true,
                    universityId,
                    instituteId,
                    academicYearId,
                    createdBy,
                    updatedBy,
                },
                transaction,
            );

            const defaultVariantId = defaultVariant.timeTableStructureVariantId || defaultVariant.dataValues?.timeTableStructureVariantId;

            const defaultVariantPeriods = newPeriods.map((p) => {
                const pVal = p.dataValues || p;
                return {
                    timeTableStructureVariantId: defaultVariantId,
                    timeTableStructurePeriodsId: pVal.timeTableCreationId,
                    startTime: pVal.startTime,
                    endTime: pVal.endTime,
                    isCourse: pVal.isCourse ?? true,
                    universityId,
                    instituteId,
                    academicYearId,
                    createdBy,
                    updatedBy,
                };
            });

            let createdDefPeriods = [];
            if (defaultVariantPeriods.length > 0) {
                createdDefPeriods = await timeTableRepository.bulkCreateVariantPeriods(
                    defaultVariantPeriods,
                    transaction,
                );
            }

            clonedVariants.push({
                timeTableStructureVariantId: defaultVariantId,
                name: 'Regular',
                isDefault: true,
                variantPeriods: createdDefPeriods,
            });
        }

        const result = {
            timeTableNameId: newTimeTableNameId,
            name: newName,
            maximumPeriod: plain.maximumPeriod,
            periodLength: plain.periodLength,
            periodGap: plain.periodGap,
            startingTime: plain.startingTime,
            weekOff: plain.weekOff,
            periods: newPeriods,
            variants: clonedVariants,
        };

        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function copyTimeTableStructure(data, createdBy, updatedBy) {
    const { timeTableNameId, name } = data;

    return await sequelize.transaction(async (transaction) => {
        const source = await timeTableRepository.getTimeTableStructureDetailsById(timeTableNameId, {
            transaction,
        });
        if (!source) {
            const err = new Error('Source timetable structure not found');
            err.statusCode = 404;
            throw err;
        }

        const plain = source.get ? source.get({ plain: true }) : source;
        const sourcePeriods = plain.timeTableName || [];

        const newName = name && name.trim()
            ? name.trim()
            : (plain.name && plain.name.startsWith('Copy of ') ? `${plain.name} (1)` : `Copy of ${plain.name || 'Structure'}`);

        const isChild = plain.sourceTimeTableNameId != null && Number(plain.sourceTimeTableNameId) > 0;
        const resolvedSourceTimeTableNameId = isChild
            ? Number(plain.sourceTimeTableNameId)
            : null;

        // 1. Create structure header (parent gets null, child keeps its parent id)
        const newStructure = await timeTableRepository.addTimeTableName(
            {
                name: newName,
                maximumPeriod: plain.maximumPeriod,
                periodLength: plain.periodLength,
                periodGap: plain.periodGap,
                startingTime: plain.startingTime,
                weekOff: plain.weekOff,
                sourceTimeTableNameId: resolvedSourceTimeTableNameId,
                createdBy,
                updatedBy,
            },
            transaction,
        );

        const newTimeTableNameId = newStructure.timeTableNameId;

        // 2. Clone periods (time slots)
        const timeSlots = sourcePeriods.map((period) => ({
            timeTableNameId: newTimeTableNameId,
            periodName: period.periodName,
            startTime: period.startTime,
            endTime: period.endTime,
            type: period.type,
            isCourse: period.isCourse,
            isBreak: period.isBreak,
            createdBy,
            updatedBy,
        }));

        let periods = [];
        if (timeSlots.length) {
            periods = await timeTableRepository.addTimeTable({ timeSlots }, transaction);
        }

        // Modern variants clone (time_table_structure_variant)
        const modernVariants = await timeTableRepository.findVariantsByStructureId(timeTableNameId, {
            transaction,
        });
        if (modernVariants && modernVariants.length > 0) {
            for (const mv of modernVariants) {
                const mvPlain = mv.get ? mv.get({ plain: true }) : mv;
                const newV = await timeTableRepository.createStructureVariant({
                    name: mvPlain.name,
                    timeTableStructureId: newTimeTableNameId,
                    isDefault: Boolean(mvPlain.isDefault),
                    universityId: newStructure.universityId,
                    instituteId: newStructure.instituteId,
                    academicYearId: newStructure.academicYearId,
                    createdBy,
                    updatedBy,
                }, transaction);
                const newVId = newV.timeTableStructureVariantId || newV.dataValues?.timeTableStructureVariantId;
                const vPeriods = mvPlain.variantPeriods || [];
                const toCreate = [];
                for (let i = 0; i < periods.length; i++) {
                    const oldPeriodId = sourcePeriods[i]?.timeTableCreationId;
                    const newPeriodId = periods[i]?.timeTableCreationId || periods[i]?.dataValues?.timeTableCreationId;
                    const matchingVP = vPeriods.find((vp) => vp.timeTableStructurePeriodsId === oldPeriodId);
                    toCreate.push({
                        timeTableStructureVariantId: newVId,
                        timeTableStructurePeriodsId: newPeriodId,
                        startTime: matchingVP ? matchingVP.startTime : periods[i].startTime,
                        endTime: matchingVP ? matchingVP.endTime : periods[i].endTime,
                        isCourse: matchingVP ? matchingVP.isCourse : (periods[i].isCourse ?? true),
                        universityId: newStructure.universityId,
                        instituteId: newStructure.instituteId,
                        academicYearId: newStructure.academicYearId,
                        createdBy,
                        updatedBy,
                    });
                }
                if (toCreate.length > 0) {
                    await timeTableRepository.bulkCreateVariantPeriods(toCreate, transaction);
                }
            }
        } else if (periods.length > 0) {
            const defV = await timeTableRepository.createStructureVariant({
                name: 'Regular',
                timeTableStructureId: newTimeTableNameId,
                isDefault: true,
                universityId: newStructure.universityId,
                instituteId: newStructure.instituteId,
                academicYearId: newStructure.academicYearId,
                createdBy,
                updatedBy,
            }, transaction);
            const defVId = defV.timeTableStructureVariantId || defV.dataValues?.timeTableStructureVariantId;
            const defVPeriods = periods.map((p) => ({
                timeTableStructureVariantId: defVId,
                timeTableStructurePeriodsId: p.timeTableCreationId || p.dataValues?.timeTableCreationId,
                startTime: p.startTime,
                endTime: p.endTime,
                isCourse: p.isCourse ?? true,
                universityId: newStructure.universityId,
                instituteId: newStructure.instituteId,
                academicYearId: newStructure.academicYearId,
                createdBy,
                updatedBy,
            }));
            if (defVPeriods.length > 0) {
                await timeTableRepository.bulkCreateVariantPeriods(defVPeriods, transaction);
            }
        }

        // 3. If copying a parent structure, clone all its child structures (for backward compatibility)
        const sourceVariants = !isChild
            ? await timeTableRepository.getStructureVariantsBySourceId(timeTableNameId, {
                transaction,
            })
            : [];

        const copiedVariants = [];
        for (const variant of sourceVariants) {
            const vPlain = variant.get ? variant.get({ plain: true }) : variant;
            let newVariantName = vPlain.name;
            if (plain.name && vPlain.name.includes(plain.name)) {
                newVariantName = vPlain.name.replace(plain.name, newName);
            } else if (!vPlain.name.startsWith("Copy of ")) {
                newVariantName = `Copy of ${vPlain.name}`;
            }

            const newVariantStructure = await timeTableRepository.addTimeTableName(
                {
                    name: newVariantName,
                    maximumPeriod: vPlain.maximumPeriod,
                    periodLength: vPlain.periodLength,
                    periodGap: vPlain.periodGap,
                    startingTime: vPlain.startingTime,
                    weekOff: vPlain.weekOff,
                    sourceTimeTableNameId: newTimeTableNameId,
                    createdBy,
                    updatedBy,
                },
                transaction,
            );

            const newVariantId = newVariantStructure.timeTableNameId;
            const vPeriods = vPlain.timeTableName || [];
            const vSlots = vPeriods.map((period) => ({
                timeTableNameId: newVariantId,
                periodName: period.periodName,
                startTime: period.startTime,
                endTime: period.endTime,
                type: period.type,
                isCourse: period.isCourse,
                isBreak: period.isBreak,
                createdBy,
                updatedBy,
            }));

            let vCreatedPeriods = [];
            if (vSlots.length) {
                vCreatedPeriods = await timeTableRepository.addTimeTable({ timeSlots: vSlots }, transaction);
            }

            copiedVariants.push({
                timeTableNameId: newVariantId,
                name: newVariantName,
                sourceTimeTableNameId: newTimeTableNameId,
                maximumPeriod: vPlain.maximumPeriod,
                periodLength: vPlain.periodLength,
                periodGap: vPlain.periodGap,
                startingTime: vPlain.startingTime,
                weekOff: vPlain.weekOff,
                periods: vCreatedPeriods,
            });
        }

        return {
            timeTableNameId: newTimeTableNameId,
            name: newName,
            sourceTimeTableNameId: resolvedSourceTimeTableNameId,
            maximumPeriod: plain.maximumPeriod,
            periodLength: plain.periodLength,
            periodGap: plain.periodGap,
            startingTime: plain.startingTime,
            weekOff: plain.weekOff,
            periods,
            variants: copiedVariants,
        };
    });
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
            attributes: ['sessionId', 'sessionName'],
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

        const validSessionIds = Array.from(sessionIds).filter(id => id === null || sessionMap[id]);
        if (validSessionIds.length === 0) {
            validSessionIds.push(null);
        }

        validSessionIds.forEach(sessionId => {
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
