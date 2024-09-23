import * as libraryItemRepository  from "../repository/libraryAddItemRepository.js";

export async function addLibraryItem(libraryData, createdBy, updatedBy) {
    try {
        const itemData = {
            ...libraryData,
            createdBy,
            updatedBy
        };
        await libraryItemRepository.addLibraryItem(itemData);
    } catch (error) {
        console.error('Error adding library item:', error);
        throw new Error('Failed to add library item');
    }
}


export async function getLibraryItemDetails(universityId) {
    return await libraryItemRepository.getLibraryItemDetails(universityId);
}

export async function getSingleLibraryItemDetails(libraryCreationId) {
    return await libraryItemRepository.getSingleLibraryItemDetails(libraryCreationId);
}

export async function updateLibrayItem(libraryAddItemId, libraryData,updatedBy) {
    libraryData.updatedBy = updatedBy;
    return await libraryItemRepository.updateLibrayItem(libraryAddItemId, libraryData);
}

export async function deleteLibrayItem(libraryAddItemId) {
    return await libraryItemRepository.deleteLibraryItem(libraryAddItemId);
}