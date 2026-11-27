import * as questionPaperBlueprintRepository from "../repository/questionPaperBlueprintRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

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
    return withAuditEvent(AUDIT_EVENTS.QUESTION_PAPER_BLUEPRINT_CREATE, async ({ transaction }) => {
        return await questionPaperBlueprintRepository.addBlueprint(blueprintData, { transaction });
    });
}

export async function getBlueprints(filters) {
    const results = await questionPaperBlueprintRepository.getBlueprints(filters);
    return results.map(row => {
        const plainRow = typeof row.toJSON === 'function' ? row.toJSON() : row;
        if (plainRow.blueprint && typeof plainRow.blueprint === 'string') {
            try {
                plainRow.blueprint = JSON.parse(plainRow.blueprint);
            } catch (e) {
                // If it fails to parse, leave as is or set to empty array
            }
        }
        
        // Extract duration and maximumMarks from associated subject's exam schedule
        const schedules = plainRow.subject?.scheduleSubject || [];
        const latestSchedule = schedules[0] || {};
        
        return {
            ...plainRow,
            duration: latestSchedule.duration != null ? Number(latestSchedule.duration) : null,
            maximumMarks: latestSchedule.maximumMarks != null ? Number(latestSchedule.maximumMarks) : null,
        };
    });
}

export async function deleteBlueprint(id, ownerId) {
    return withAuditEvent(AUDIT_EVENTS.QUESTION_PAPER_BLUEPRINT_DELETE, async ({ transaction }) => {
        return await questionPaperBlueprintRepository.deleteBlueprint(id, ownerId, { transaction });
    });
}
