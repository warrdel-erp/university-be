import * as examStructureRepository from "../repository/examStructureRepository.js";
import * as examScheduleRepository from "../repository/examScheduleRepository.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";

export async function addExamStructure(examDetail, createdBy, updatedBy,universityId,instituteId) {
    examDetail.createdBy = createdBy;
    examDetail.updatedBy = updatedBy;
    examDetail.universityId = universityId;
    examDetail.instituteId = instituteId;
    const result = await examStructureRepository.addExamStructure(examDetail);
    return result;
};

export async function getExamStructure(universityId,acedmicYearId,role,instituteId) {
    return await examStructureRepository.getExamStructure(universityId,acedmicYearId,role,instituteId);
};

export async function getSingleExamStructure(courseId,sessionId, universityId) {
    return await examStructureRepository.getSingleExamStructure(courseId,sessionId, universityId);
};

export async function deleteExamStructure(examStructureId) {
    return await examStructureRepository.deleteExamStructure(examStructureId);
};

export async function updateExamStructure(examStructureId, examDetail, updatedBy) {
    examDetail.updatedBy = updatedBy;
    await examStructureRepository.updateExamStructure(examStructureId, examDetail);
};

export async function addExamType(examDetail, createdBy, updatedBy,universityId,instituteId) {
    const payload = { ...examDetail };
    // scheduledBy should not be accepted in create exam setup type.
    delete payload.scheduledBy;
    payload.createdBy = createdBy;
    payload.updatedBy = updatedBy;
    payload.universityId = universityId;
    payload.instituteId = instituteId;
    const result = await examStructureRepository.addExamType(payload);
    return result;
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

export async function getSingleExamType(courseId, sessionId, universityId, termNumber, instituteId) {
    const result = await examStructureRepository.getSingleExamType(
        courseId,
        sessionId,
        universityId,
        termNumber,
        instituteId,
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
            if (termIds.length > 0 && sessionId && instituteId && universityId) {
                const counts = await Promise.all(
                    termIds.map((examSetupTypeTermId) =>
                        studentHallTicketRepository.countHallTickets({
                            examSetupTypeTermId,
                            sessionId,
                            instituteId,
                            universityId,
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