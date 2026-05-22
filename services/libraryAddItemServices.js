import * as libraryItemRepository from "../repository/libraryAddItemRepository.js";

export async function addLibraryItem(libraryData, createdBy, updatedBy) {
    try {
        await libraryItemRepository.addLibraryItem({
            ...libraryData,
            createdBy,
            updatedBy,
        });
    } catch (error) {
        console.error("Error adding library item:", error);
        throw new Error("Failed to add library item");
    }
}

export async function getLibraryItemDetails(universityId) {
    return libraryItemRepository.getLibraryItemDetails(universityId);
}

export async function getSingleLibraryItemDetails(libraryCreationId) {
    return libraryItemRepository.getSingleLibraryItemDetails(libraryCreationId);
}

export async function updateLibrayItem(libraryAddItemId, libraryData, updatedBy) {
    libraryData.updatedBy = updatedBy;
    return libraryItemRepository.updateLibrayItem(libraryAddItemId, libraryData);
}

export async function deleteLibrayItem(libraryAddItemId) {
    return libraryItemRepository.deleteLibraryItem(libraryAddItemId);
}
