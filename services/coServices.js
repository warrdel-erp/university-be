import * as coCreationService from '../repository/coRepository.js';

export async function addCo(coData, createdBy, updatedBy) {
    coData.createdBy = createdBy;
    coData.updatedBy = updatedBy;
    return await coCreationService.addCo(coData);
}

export async function getAllCo() {
    return await coCreationService.getAllCo();
}

export async function getSingleCoDetails(coId) {
    return await coCreationService.getSingleCoDetails(coId);
}

export async function updateCo(coId, coData, updatedBy) {
    coData.updatedBy = updatedBy;
    return await coCreationService.updateCo(coId, coData);
}

export async function deleteCo(coId) {
    return await coCreationService.deleteCo(coId);
}

export async function addCoWeightage(coData, createdBy, updatedBy, universityId, instituteId) {
    const { acedmicYearId, coId, term, total, data } = coData;

    if (!Array.isArray(data)) {
        throw new Error("Invalid 'data' format. Expected an array.");
    }

    const entries = data.map((item) => ({
        acedmicYearId,
        coId,
        term,
        total,
        name: item.name,
        mark: item.mark,
        createdBy,
        updatedBy,
        universityId,
        instituteId,
    }));

    return await coCreationService.addCoWeightage(entries);
}

export async function getAllCoWeightage() {
    return await coCreationService.getAllCoWeightage();
}

export async function getSingleCoDetailsWeightage(coWeightageId) {
    return await coCreationService.getSingleCoDetailsWeightage(coWeightageId);
}

export async function updateCoWeightage(coData, updatedBy) {
    const { acedmicYearId, coId, term, total, data } = coData;

    if (!Array.isArray(data)) {
        throw new Error("Invalid 'data' format. Expected an array.");
    }

    const results = [];

    for (const item of data) {
        if (!item.coWeightageId) {
            throw new Error("Missing 'coWeightageId' in one of the data items.");
        }

        const updatePayload = {
            acedmicYearId,
            coId,
            term,
            total,
            name: item.name,
            mark: item.mark,
            updatedBy,
        };

        const result = await coCreationService.updateCoWeightage(item.coWeightageId, updatePayload);
        results.push({ coWeightageId: item.coWeightageId, updated: result[0] > 0 });
    }

    return results;
}
