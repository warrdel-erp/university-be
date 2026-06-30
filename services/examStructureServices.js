import * as examStructureRepository from "../repository/examStructureRepository.js";
import * as examScheduleRepository from "../repository/examScheduleRepository.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";

export async function addExamStructure(examDetail, createdBy, updatedBy) {
    examDetail.createdBy = createdBy;
    examDetail.updatedBy = updatedBy;
    return await examStructureRepository.addExamStructure(examDetail);
};

export async function getExamStructure(academicYearId) {
    return await examStructureRepository.getExamStructure(academicYearId);
};

export async function getSingleExamStructure(courseId, sessionId, academicYearId) {
    return await examStructureRepository.getSingleExamStructure(courseId, sessionId, academicYearId);
};

export async function deleteExamStructure(examStructureId) {
    return await examStructureRepository.deleteExamStructure(examStructureId);
};

export async function updateExamStructure(examStructureId, examDetail, updatedBy) {
    examDetail.updatedBy = updatedBy;
    await examStructureRepository.updateExamStructure(examStructureId, examDetail);
};

export async function addExamType(examDetail, createdBy, updatedBy) {
    const payload = { ...examDetail };
    delete payload.scheduledBy;
    payload.createdBy = createdBy;
    payload.updatedBy = updatedBy;
    return await examStructureRepository.addExamType(payload);
};

export async function getDetailByExamType(examSetupTypeId) {
    return await examStructureRepository.getDetailByExamType(examSetupTypeId);
};

function toPlain(row) {
    if (!row) return null;
    return typeof row.toJSON === "function" ? row.toJSON() : row;
}

function resolveTerm(termNumber, termRows) {
    if (termNumber != null && termNumber !== "") {
        const parsed = Number(termNumber);
        return Number.isNaN(parsed) ? termRows[0]?.term ?? null : parsed;
    }
    return termRows[0]?.term ?? null;
}

function collectTermIds(rows) {
    return [
        ...new Set(
            rows.flatMap((row) =>
                (toPlain(row).examSetupTypeTerms ?? [])
                    .map((termItem) => termItem?.examSetupTypeTermId)
                    .filter(Boolean),
            ),
        ),
    ];
}

/** One count per unique session + course + term + academic year (not per exam type row). */
async function buildStudentCountMap(rows, sessionId, courseId, academicYearId, termNumber) {
    const countMap = new Map();
    if (!sessionId || !courseId) {
        return countMap;
    }

    const pending = [];
    for (const row of rows) {
        const plain = toPlain(row);
        const term = resolveTerm(termNumber, plain.examSetupTypeTerms ?? []);
        const yearId = academicYearId ?? plain.examStructure?.academicYearId;
        if (term == null || yearId == null) {
            continue;
        }

        const key = `${term}:${yearId}`;
        if (!countMap.has(key)) {
            pending.push(
                examScheduleRepository
                    .getStudentCountByGroup(sessionId, courseId, term, yearId)
                    .then((count) => countMap.set(key, count)),
            );
        }
    }

    await Promise.all(pending);
    return countMap;
}

function resolveStudentCount(plain, sessionId, courseId, academicYearId, termNumber, countMap) {
    if (!sessionId || !courseId) {
        return 0;
    }
    const term = resolveTerm(termNumber, plain.examSetupTypeTerms ?? []);
    const yearId = academicYearId ?? plain.examStructure?.academicYearId;
    if (term == null || yearId == null) {
        return 0;
    }
    return countMap.get(`${term}:${yearId}`) ?? 0;
}

export async function getSingleExamType(courseId, sessionId, academicYearId, termNumber) {
    const rows = await examStructureRepository.getSingleExamType(
        courseId,
        sessionId,
        academicYearId,
        termNumber,
    );

    if (!rows?.length) {
        return [];
    }

    const termIds = collectTermIds(rows);
    const [studentCountMap, hallTicketCountByTermId] = await Promise.all([
        buildStudentCountMap(rows, sessionId, courseId, academicYearId, termNumber),
        sessionId && termIds.length
            ? studentHallTicketRepository.countHallTicketsByTermIds(termIds, sessionId)
            : Promise.resolve(new Map()),
    ]);

    return rows.map((row) => {
        const plain = toPlain(row);
        const rowTermIds = (plain.examSetupTypeTerms ?? [])
            .map((termItem) => termItem?.examSetupTypeTermId)
            .filter(Boolean);

        return {
            ...plain,
            studentCount: resolveStudentCount(
                plain,
                sessionId,
                courseId,
                academicYearId,
                termNumber,
                studentCountMap,
            ),
            isHallTicketGenerated: rowTermIds.some(
                (termId) => (hallTicketCountByTermId.get(termId) ?? 0) > 0,
            ),
        };
    });
};

export async function deleteExamType(examSetupTypeId) {
    return await examStructureRepository.deleteExamType(examSetupTypeId);
};

export async function updateExamType(examSetupTypeId, examDetail, updatedBy) {
    examDetail.updatedBy = updatedBy;
    await examStructureRepository.updateExamType(examSetupTypeId, examDetail);
};
