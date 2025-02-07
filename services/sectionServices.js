import * as SectionCreationService  from "../repository/sectionRepository.js";

export async function addSection(SectionData, createdBy, updatedBy,universityId) {

        SectionData.createdBy = createdBy;
        SectionData.updatedBy = updatedBy;
        SectionData.universityId = universityId
        const Section = await SectionCreationService.addSection(SectionData);
        return Section;
};

export async function getSectionDetails(universityId) {
    return await SectionCreationService.getSectionDetails(universityId);
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