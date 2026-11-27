import * as subjectWeightageRepository from "../repository/subjectWeightageRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

export async function createWeightageBulk(dataList, userId) {
    if (!Array.isArray(dataList) || dataList.length === 0) {
        throw new Error("Invalid or empty data list");
    }

    return withAuditEvent(AUDIT_EVENTS.SUBJECT_WEIGHTAGE_BULK_CREATE, async ({ transaction }) => {
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

        return await subjectWeightageRepository.createOrUpdateWeightageBulk(dataList, { transaction });
    });
}

export async function getSubjectsWithWeightages(sessionId, courseId, term) {
    return await subjectWeightageRepository.getSubjectsWithWeightages(sessionId, courseId, term);
}
