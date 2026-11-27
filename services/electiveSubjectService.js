import * as electiveSubjectServices  from "../repository/electiveSubjectRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

function formatElectiveSubject(row) {
    const plain = row?.get ? row.get({ plain: true }) : row;
    const { course, studentMappings, ...rest } = plain;
    return {
        ...rest,
        courseName: course?.courseName ?? null,
        mappedCount: Array.isArray(studentMappings) ? studentMappings.length : 0,
    };
}

export async function addElectiveSubject(electiveSubjectData, createdBy, updatedBy, options = {}) {
    electiveSubjectData.createdBy = createdBy;
    electiveSubjectData.updatedBy = updatedBy;
    if (options?.transaction) {
        return await electiveSubjectServices.addElectiveSubject(electiveSubjectData, options);
    }
    return await withAuditEvent(AUDIT_EVENTS.ELECTIVE_SUBJECT_CREATE, async ({ transaction }) => {
        return await electiveSubjectServices.addElectiveSubject(electiveSubjectData, { ...options, transaction });
    });
}

export async function getElectiveSubjectDetails() {
    const rows = await electiveSubjectServices.getElectiveSubjectDetails();
    return rows.map(formatElectiveSubject);
}

export async function getSingleElectiveSubjectDetails(electiveSubjectId) {
    const row = await electiveSubjectServices.getSingleElectiveSubjectDetails(electiveSubjectId);
    return row ? formatElectiveSubject(row) : null;
}

export async function updateElectiveSubject(electiveSubjectId, electiveSubjectData, updatedBy, options = {}) {    
    electiveSubjectData.updatedBy = updatedBy;
    if (options?.transaction) {
        return await electiveSubjectServices.updateElectiveSubject(electiveSubjectId, electiveSubjectData, options);
    }
    return await withAuditEvent(AUDIT_EVENTS.ELECTIVE_SUBJECT_UPDATE, async ({ transaction }) => {
        return await electiveSubjectServices.updateElectiveSubject(electiveSubjectId, electiveSubjectData, { ...options, transaction });
    });
}

export async function deleteElectiveSubject(electiveSubjectId, options = {}) {
    if (options?.transaction) {
        return await electiveSubjectServices.deleteElectiveSubject(electiveSubjectId, options);
    }
    return await withAuditEvent(AUDIT_EVENTS.ELECTIVE_SUBJECT_DELETE, async ({ transaction }) => {
        return await electiveSubjectServices.deleteElectiveSubject(electiveSubjectId, { ...options, transaction });
    });
}

export async function getMappedStudents(electiveSubjectId, options = {}) {
    return await electiveSubjectServices.getMappedStudentsForElective(electiveSubjectId, options);
}

export async function getEligibleStudents(electiveSubjectId, options = {}) {
    return await electiveSubjectServices.getEligibleStudentsForElective(electiveSubjectId, options);
}

export async function mapStudents(electiveSubjectId, studentIds, createdBy, options = {}) {
    if (options?.transaction) {
        return await electiveSubjectServices.mapStudentsToElective(electiveSubjectId, studentIds, createdBy, options);
    }
    return await withAuditEvent(AUDIT_EVENTS.ELECTIVE_SUBJECT_STUDENTS_MAP, async ({ transaction }) => {
        return await electiveSubjectServices.mapStudentsToElective(electiveSubjectId, studentIds, createdBy, { ...options, transaction });
    });
}

export async function unmapStudent(electiveSubjectId, studentId, options = {}) {
    if (options?.transaction) {
        return await electiveSubjectServices.unmapStudentFromElective(electiveSubjectId, studentId, options);
    }
    return await withAuditEvent(AUDIT_EVENTS.ELECTIVE_SUBJECT_STUDENT_UNMAP, async ({ transaction }) => {
        return await electiveSubjectServices.unmapStudentFromElective(electiveSubjectId, studentId, { ...options, transaction });
    });
}
