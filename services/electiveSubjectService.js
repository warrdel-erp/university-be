import * as electiveSubjectServices  from "../repository/electiveSubjectRepository.js";

export async function addElectiveSubject(electiveSubjectData, createdBy, updatedBy) {
        electiveSubjectData.createdBy = createdBy;
        electiveSubjectData.updatedBy = updatedBy;
        return await electiveSubjectServices.addElectiveSubject(electiveSubjectData);
    };

export async function getElectiveSubjectDetails() {
    return await electiveSubjectServices.getElectiveSubjectDetails();
}

export async function getSingleElectiveSubjectDetails(electiveSubjectId) {
    return await electiveSubjectServices.getSingleElectiveSubjectDetails(electiveSubjectId);
}


export async function updateElectiveSubject(electiveSubjectId, electiveSubjectData, updatedBy) {    

    electiveSubjectData.updatedBy = updatedBy;
    await electiveSubjectServices.updateElectiveSubject(electiveSubjectId, electiveSubjectData);
}

export async function deleteElectiveSubject(electiveSubjectId) {
    return await electiveSubjectServices.deleteElectiveSubject(electiveSubjectId);
}
