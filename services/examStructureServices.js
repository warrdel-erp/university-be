import * as examStructureRepository from "../repository/examStructureRepository.js";
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
    examDetail.createdBy = createdBy;
    examDetail.updatedBy = updatedBy;
    examDetail.universityId = universityId;
    examDetail.instituteId = instituteId;
    const result = await examStructureRepository.addExamType(examDetail);
    return result;
};

export async function getDetailByExamType(examSetupTypeId) {
    return await examStructureRepository.getDetailByExamType(examSetupTypeId);
};

export async function getSingleExamType(courseId, sessionId, universityId, termNumber, instituteId) {
    const result = await examStructureRepository.getSingleExamType(courseId, sessionId, universityId, termNumber);

    return Promise.all((result || []).map(async (row) => {
        const plain = typeof row?.toJSON === "function" ? row.toJSON() : row;
        const termRows = Array.isArray(plain?.examSetupTypeTerms) ? plain.examSetupTypeTerms : [];
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
                        universityId
                    })
                )
            );
            isHallTicketGenerated = counts.some((count) => Number(count) > 0);
        }

        return {
            ...plain,
            isHallTicketGenerated
        };
    }));
};

export async function deleteExamType(examSetupTypeId) {
    return await examStructureRepository.deleteExamType(examSetupTypeId);
};

export async function updateExamType(examSetupTypeId, examDetail, updatedBy) {
    examDetail.updatedBy = updatedBy;
    await examStructureRepository.updateExamType(examSetupTypeId, examDetail);
};