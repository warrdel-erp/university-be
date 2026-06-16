import * as examStructureRepository from "../repository/examStructureRepository.js";
import * as examScheduleRepository from "../repository/examScheduleRepository.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";

export async function addExamStructure(examDetail, createdBy, updatedBy) {
    examDetail.createdBy = createdBy;
    examDetail.updatedBy = updatedBy;
    return await examStructureRepository.addExamStructure(examDetail);
};

export async function getExamStructure(acedmicYearId) {
    return await examStructureRepository.getExamStructure(acedmicYearId);
};

export async function getSingleExamStructure(courseId, sessionId) {
    return await examStructureRepository.getSingleExamStructure(courseId, sessionId);
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

export async function getSingleExamType(courseId, sessionId, termNumber) {
    const result = await examStructureRepository.getSingleExamType(
        courseId,
        sessionId,
        termNumber,
    );

    const rows = result ?? [];
    if (!rows.length) {
        return [];
    }

    return Promise.all(
        rows.map(async (row) => {
            const plain = toPlain(row);
            const termRows = Array.isArray(plain?.examSetupTypeTerms) ? plain.examSetupTypeTerms : [];
            const term = resolveTerm(termNumber, termRows);
            const acedmicYearId = plain?.examStructure?.acedmicYearId;

            let studentCount = 0;
            if (sessionId && courseId && term != null && acedmicYearId) {
                studentCount = await examScheduleRepository.getStudentCountByGroup(
                    sessionId,
                    courseId,
                    term,
                    acedmicYearId,
                );
            }

            const termIds = termRows
                .map((termItem) => termItem?.examSetupTypeTermId)
                .filter(Boolean);

            let isHallTicketGenerated = false;
            if (termIds.length > 0 && sessionId) {
                const counts = await Promise.all(
                    termIds.map((examSetupTypeTermId) =>
                        studentHallTicketRepository.countHallTickets({
                            examSetupTypeTermId,
                            sessionId,
                        }),
                    ),
                );
                isHallTicketGenerated = counts.some((count) => Number(count) > 0);
            }

            return {
                ...plain,
                isHallTicketGenerated,
                studentCount,
            };
        }),
    );
};

export async function deleteExamType(examSetupTypeId) {
    return await examStructureRepository.deleteExamType(examSetupTypeId);
};

export async function updateExamType(examSetupTypeId, examDetail, updatedBy) {
    examDetail.updatedBy = updatedBy;
    await examStructureRepository.updateExamType(examSetupTypeId, examDetail);
};
