import * as questionPaperBlueprintRepository from "../repository/questionPaperBlueprintRepository.js";

export async function addBlueprint(blueprintData, createdBy, updatedBy, universityId) {
    blueprintData.createdBy = createdBy;
    blueprintData.updatedBy = updatedBy;
    blueprintData.universityId = universityId;
    const result = await questionPaperBlueprintRepository.addBlueprint(blueprintData);
    return result;
}

export async function getBlueprints(universityId, filters) {
    return await questionPaperBlueprintRepository.getBlueprints(universityId, filters);
}

export async function deleteBlueprint(id, universityId) {
    return await questionPaperBlueprintRepository.deleteBlueprint(id, universityId);
}
