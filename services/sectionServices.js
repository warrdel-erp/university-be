import * as SectionCreationService from "../repository/sectionRepository.js";

export async function addSection(SectionData, createdBy, updatedBy) {
    SectionData.createdBy = createdBy;
    SectionData.updatedBy = updatedBy;
    return await SectionCreationService.addSection(SectionData);
}

export async function getSectionDetails() {
    return await SectionCreationService.getSectionDetails();
}

export async function getSingleSectionDetails(sectionId) {
    return await SectionCreationService.getSingleSectionDetails(sectionId);
}

export async function deleteSection(sectionId) {
    return await SectionCreationService.deleteSection(sectionId);
}

export async function updateSection(sectionId, SectionData, updatedBy) {
    SectionData.updatedBy = updatedBy;
    await SectionCreationService.updateSection(sectionId, SectionData);
}
