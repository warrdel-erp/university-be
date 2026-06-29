import * as electiveSubjectServices  from "../repository/electiveSubjectRepository.js";

function formatElectiveSubject(row) {
    const plain = row?.get ? row.get({ plain: true }) : row;
    const { course, ...rest } = plain;
    return {
        ...rest,
        courseName: course?.courseName ?? null,
    };
}

export async function addElectiveSubject(electiveSubjectData, createdBy, updatedBy) {
        electiveSubjectData.createdBy = createdBy;
        electiveSubjectData.updatedBy = updatedBy;
        return await electiveSubjectServices.addElectiveSubject(electiveSubjectData);
    };

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
