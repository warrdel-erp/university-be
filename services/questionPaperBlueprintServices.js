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

export async function addBlueprint(blueprintData, createdBy, updatedBy) {
    blueprintData.createdBy = createdBy;
    blueprintData.updatedBy = updatedBy;
    blueprintData.totalMarks = calculateTotalMarks(blueprintData.blueprint);
    return await questionPaperBlueprintRepository.addBlueprint(blueprintData);
}

export async function getBlueprints(filters) {
    return await questionPaperBlueprintRepository.getBlueprints(filters);
}

export async function deleteBlueprint(id) {
    return await questionPaperBlueprintRepository.deleteBlueprint(id);
}
