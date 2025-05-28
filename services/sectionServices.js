import * as SectionCreationService  from "../repository/sectionRepository.js";

export async function addSection(SectionData, createdBy, updatedBy,universityId,instituteId,role) {

        SectionData.createdBy = createdBy;
        SectionData.updatedBy = updatedBy;
        SectionData.universityId = universityId,
        SectionData.instituteId = instituteId,
        SectionData.role = role
        const Section = await SectionCreationService.addSection(SectionData);
        return Section;
};

export async function getSectionDetails(universityId,acedmicYearId,instituteId,role) {
    return await SectionCreationService.getSectionDetails(universityId,acedmicYearId,instituteId,role);
}

export async function getSingleSectionDetails(sectionId,universityId) {
    return await SectionCreationService.getSingleSectionDetails(sectionId,universityId);
}

export async function deleteSection(sectionId) {
    return await SectionCreationService.deleteSection(sectionId);
}

export async function updateSection(sectionId, SectionData, updatedBy) {    

    SectionData.updatedBy = updatedBy;
    await SectionCreationService.updateSection(sectionId, SectionData);
}