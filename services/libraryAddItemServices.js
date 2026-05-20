import * as libraryItemRepository from "../repository/libraryAddItemRepository.js";
import * as libraryCreationRepository from "../repository/libraryCreationRepository.js";

async function resolveCodeMasterIds(genre, aisle, shelf, transaction) {
    if (genre && aisle && shelf) {
        return [genre, aisle, shelf];
    }

    const defaults = await libraryItemRepository.findFirstCodeMasterTypeIds(3, transaction);
    if (defaults.length < 3) {
        throw new Error(
            "Genre, aisle, and shelf codes are required to register this book for issue",
        );
    }

    return [
        genre ?? defaults[0],
        aisle ?? defaults[1],
        shelf ?? defaults[2],
    ];
}

export async function ensureLibraryAddItemId(
    { libraryAddItemId, libraryBookId, libraryCreationId, genre, aisle, shelf },
    createdBy,
    updatedBy,
    transaction,
) {
    const existingItem = await libraryItemRepository.findById(libraryAddItemId, transaction);
    if (existingItem) {
        return libraryAddItemId;
    }

    const bookId = libraryBookId ?? libraryAddItemId;
    const book = await libraryCreationRepository.getSingleBookDetails(bookId, transaction);
    if (!book) {
        throw new Error(
            "Library item not found. Add the book via POST /libraryItem or provide a valid libraryAddItemId.",
        );
    }

    const bookData = book.get ? book.get({ plain: true }) : book;
    const resolvedCreationId = libraryCreationId ?? bookData.libraryCreationId;
    if (!resolvedCreationId) {
        throw new Error("libraryCreationId is required to register this book for issue");
    }

    const matchedItem = await libraryItemRepository.findByCreationAndTitle(
        {
            libraryCreationId: resolvedCreationId,
            name: bookData.title,
            author: bookData.authors ?? null,
        },
        transaction,
    );
    if (matchedItem) {
        return matchedItem.libraryAddItemId;
    }

    const [genreId, aisleId, shelfId] = await resolveCodeMasterIds(
        genre,
        aisle,
        shelf,
        transaction,
    );

    const newItem = await libraryItemRepository.addLibraryItem(
        {
            libraryCreationId: resolvedCreationId,
            name: bookData.title,
            author: bookData.authors ?? null,
            publisher: bookData.publisher ?? "Unknown",
            genre: genreId,
            aisle: aisleId,
            shelf: shelfId,
            createdBy,
            updatedBy,
        },
        transaction,
    );

    return newItem.libraryAddItemId;
}

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