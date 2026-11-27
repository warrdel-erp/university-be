import * as coCreationService from '../repository/coRepository.js';
import { withAuditEvent } from '../utility/audit/withAuditEvent.js';
import { AUDIT_EVENTS } from '../const/auditEvents.js';

export async function addCo(coData, createdBy, updatedBy) {
    return withAuditEvent(AUDIT_EVENTS.CO_CREATE, async ({ transaction }) => {
        coData.createdBy = createdBy;
        coData.updatedBy = updatedBy;
        return await coCreationService.addCo(coData, { transaction });
    });
}

export async function getAllCo() {
    return await coCreationService.getAllCo();
}

export async function getSingleCoDetails(coId) {
    return await coCreationService.getSingleCoDetails(coId);
}

export async function updateCo(coId, coData, updatedBy) {
    return withAuditEvent(AUDIT_EVENTS.CO_UPDATE, async ({ transaction }) => {
        coData.updatedBy = updatedBy;
        return await coCreationService.updateCo(coId, coData, { transaction });
    });
}

export async function deleteCo(coId) {
    return withAuditEvent(AUDIT_EVENTS.CO_DELETE, async ({ transaction }) => {
        return await coCreationService.deleteCo(coId, { transaction });
    });
}

export async function addCoWeightage(coData, createdBy, updatedBy) {
    return withAuditEvent(AUDIT_EVENTS.CO_WEIGHTAGE_CREATE, async ({ transaction }) => {
        const { academicYearId, coId, term, total, data } = coData;

        if (!Array.isArray(data)) {
            throw new Error("Invalid 'data' format. Expected an array.");
        }

        const entries = data.map((item) => ({
            academicYearId,
            coId,
            term,
            total,
            name: item.name,
            mark: item.mark,
            createdBy,
            updatedBy,
        }));

        return await coCreationService.addCoWeightage(entries, { transaction });
    });
}

export async function getAllCoWeightage() {
    return await coCreationService.getAllCoWeightage();
}

export async function getSingleCoDetailsWeightage(coWeightageId) {
    return await coCreationService.getSingleCoDetailsWeightage(coWeightageId);
}

export async function updateCoWeightage(coData, updatedBy) {
    return withAuditEvent(AUDIT_EVENTS.CO_WEIGHTAGE_UPDATE, async ({ transaction }) => {
        const { academicYearId, coId, term, total, data } = coData;

        if (!Array.isArray(data)) {
            throw new Error("Invalid 'data' format. Expected an array.");
        }

        const results = [];

        for (const item of data) {
            if (!item.coWeightageId) {
                throw new Error("Missing 'coWeightageId' in one of the data items.");
            }

            const updatePayload = {
                academicYearId,
                coId,
                term,
                total,
                name: item.name,
                mark: item.mark,
                updatedBy,
            };

            const result = await coCreationService.updateCoWeightage(item.coWeightageId, updatePayload, { transaction });
            results.push({ coWeightageId: item.coWeightageId, updated: result[0] > 0 });
        }

        return results;
    });
}
