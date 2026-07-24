import * as electiveSubjectServices  from "../repository/electiveSubjectRepository.js";

function formatElectiveSubject(row) {
    const plain = row?.get ? row.get({ plain: true }) : row;
    const { course, studentMappings, ...rest } = plain;
    return {
        ...rest,
        courseName: course?.courseName ?? null,
        mappedCount: Array.isArray(studentMappings) ? studentMappings.length : 0,
    };
}

export async function addElectiveSubject(electiveSubjectData, createdBy, updatedBy) {
    electiveSubjectData.createdBy = createdBy;
    electiveSubjectData.updatedBy = updatedBy;
    return await electiveSubjectServices.addElectiveSubject(electiveSubjectData);
}

export async function getElectiveSubjectDetails() {
    const rows = await electiveSubjectServices.getElectiveSubjectDetails();
    return rows.map(formatElectiveSubject);
}

export async function getSingleElectiveSubjectDetails(electiveSubjectId) {
    const row = await electiveSubjectServices.getSingleElectiveSubjectDetails(electiveSubjectId);
    return row ? formatElectiveSubject(row) : null;
}

export async function updateElectiveSubject(electiveSubjectId, electiveSubjectData, updatedBy) {    
    electiveSubjectData.updatedBy = updatedBy;
    await electiveSubjectServices.updateElectiveSubject(electiveSubjectId, electiveSubjectData);
}

export async function deleteElectiveSubject(electiveSubjectId) {
    return await electiveSubjectServices.deleteElectiveSubject(electiveSubjectId);
}

export async function getMappedStudents(electiveSubjectId, options = {}) {
    return await electiveSubjectServices.getMappedStudentsForElective(electiveSubjectId, options);
}

export async function getEligibleStudents(electiveSubjectId, options = {}) {
    return await electiveSubjectServices.getEligibleStudentsForElective(electiveSubjectId, options);
}

export async function mapStudents(electiveSubjectId, studentIds, createdBy) {
    return await electiveSubjectServices.mapStudentsToElective(electiveSubjectId, studentIds, createdBy);
}

export async function unmapStudent(electiveSubjectId, studentId) {
    return await electiveSubjectServices.unmapStudentFromElective(electiveSubjectId, studentId);
}

