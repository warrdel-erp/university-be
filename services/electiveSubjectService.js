import * as electiveSubjectServices  from "../repository/electiveSubjectRepository.js";

export async function addElectiveSubject(electiveSubjectData, createdBy, updatedBy,universityId) {

        electiveSubjectData.createdBy = createdBy;
        electiveSubjectData.updatedBy = updatedBy;
        electiveSubjectData.universityId = universityId
        const ElectiveSubject = await electiveSubjectServices.addElectiveSubject(electiveSubjectData);
        return ElectiveSubject;
};

export async function getElectiveSubjectDetails(universityId,acedmicYearId) {
    return await electiveSubjectServices.getElectiveSubjectDetails(universityId,acedmicYearId);
}

export async function getSingleElectiveSubjectDetails(electiveSubjectId,universityId) {
    return await electiveSubjectServices.getSingleElectiveSubjectDetails(electiveSubjectId,universityId);
}


export async function updateElectiveSubject(electiveSubjectId, electiveSubjectData, updatedBy) {    

    electiveSubjectData.updatedBy = updatedBy;
    await electiveSubjectServices.updateElectiveSubject(electiveSubjectId, electiveSubjectData);
}

export async function deleteElectiveSubject(electiveSubjectId) {
    return await electiveSubjectServices.deleteElectiveSubject(electiveSubjectId);
}
