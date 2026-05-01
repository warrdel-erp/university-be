import * as questionPaperBlueprintRepository from "../repository/questionPaperBlueprintRepository.js";

/**
 * Calculates total marks from all sections of a blueprint.
 * Each section contributes: totalQuestions × marksPerQuestion.
 * @param {Array} blueprint - Array of blueprint section objects
 * @returns {number}
 */
function calculateTotalMarks(blueprint) {
    if (!Array.isArray(blueprint)) return 0;
    return blueprint.reduce((total, section) => {
        return total + (section.totalQuestions || 0) * (section.marksPerQuestion || 0);
    }, 0);
}

export async function addBlueprint(blueprintData, createdBy, updatedBy, universityId) {
    blueprintData.createdBy = createdBy;
    blueprintData.updatedBy = updatedBy;
    blueprintData.universityId = universityId;
    blueprintData.totalMarks = calculateTotalMarks(blueprintData.blueprint);
    const result = await questionPaperBlueprintRepository.addBlueprint(blueprintData);
    return result;
}

export async function getBlueprints(universityId, filters) {
    return await questionPaperBlueprintRepository.getBlueprints(universityId, filters);
}

export async function deleteBlueprint(id, universityId) {
    return await questionPaperBlueprintRepository.deleteBlueprint(id, universityId);
}
