import * as subjectWeightageRepository from "../repository/subjectWeightageRepository.js";

export async function createWeightageBulk(dataList, userId) {
    if (!Array.isArray(dataList) || dataList.length === 0) {
        throw new Error("Invalid or empty data list");
    }

    // Validate each entry (or we could optimize by grouping by term/subject/session)
    for (const data of dataList) {
        await subjectWeightageRepository.checkIdsBelongToSameCourse(
            data.examSetupTypeTermId, 
            data.subjectId, 
            data.sessionId
        );
        data.createdBy = userId;
        data.updatedBy = userId;
    }

    return await subjectWeightageRepository.createOrUpdateWeightageBulk(dataList);
}

export async function getSubjectsWithWeightages(sessionId, examSetupTypeTermId) {
    return await subjectWeightageRepository.getSubjectsWithWeightages(sessionId, examSetupTypeTermId);
}
