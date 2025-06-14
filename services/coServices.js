import * as coCreationService from "../repository/coRepository.js";

export async function addCo(coData, createdBy, updatedBy, universityId, instituteId) {

    coData.createdBy = createdBy;
    coData.updatedBy = updatedBy;
    coData.universityId = universityId;
    coData.instituteId = instituteId;
    const co = await coCreationService.addCo(coData);
    return co;
};

export async function getAllCo(universityId, instituteId, role, acedmicYearId) {
    return await coCreationService.getAllCo(universityId, instituteId, role, acedmicYearId);
}

export async function getSingleCoDetails(coId, universityId) {
    return await coCreationService.getSingleCoDetails(coId, universityId);
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

    const entries = data.map(item => ({
        acedmicYearId,
        coId,
        term,
        total,
        name: item.name,
        mark: item.mark,
        createdBy,
        updatedBy,
        universityId,
        instituteId
    }));

    const result = await coCreationService.addCoWeightage(entries);
    return result;
};

export async function getAllCoWeightage(universityId, instituteId, role, acedmicYearId) {
    return await coCreationService.getAllCoWeightage(universityId, instituteId, role, acedmicYearId);
}

export async function getSingleCoDetailsWeightage(coWeightageId, universityId) {
    return await coCreationService.getSingleCoDetailsWeightage(coWeightageId, universityId);
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
            updatedBy
        };

        const result = await coCreationService.updateCoWeightage(item.coWeightageId, updatePayload);
        results.push({ coWeightageId: item.coWeightageId, updated: result[0] > 0 });
    }

    return results;
}
