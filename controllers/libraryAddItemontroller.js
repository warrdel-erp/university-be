import * as libraryItem  from  "../services/libraryAddItemServices.js";

export async function addLibraryItem(req, res) {
    const {libraryCreationId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(libraryCreationId)){
           return res.status(400).send('libraryCreationId is required')
        }
        const newLibrary = await libraryItem.addLibraryItem(req.body,createdBy,updatedBy);
        res.status(200).json({ message: 'Library item added successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getLibraryItemDetails(req, res) {
    try {
        const universityId = req.user.universityId;
        const libraries = await libraryItem.getLibraryItemDetails(universityId);
        res.status(200).json(libraries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleLibraryItemDetails(req, res) {
    try {
        const { libraryCreationId } = req.query;
        const library = await libraryItem.getSingleLibraryItemDetails(libraryCreationId);
        if (library) {
            res.status(200).json(library);
        } else {
            res.status(404).json({ message: "Library not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateLibrayItem(req, res) {
    try {
        const {libraryAddItemId,libraryCreationId} = req.body
        if(!(libraryAddItemId && libraryCreationId)){
            return res.status(400).send('libraryAddItemId and libraryCreationId  is required')
         }
         const updatedBy = req.user.userId;
        const updatedLibrary = await libraryItem.updateLibrayItem(libraryAddItemId, req.body,updatedBy);
        if (updatedLibrary) {
            res.status(200).json(updatedLibrary);
        } else {
            res.status(404).json({ message: "Library not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteLibrayItem(req, res) {
    try {
        const { libraryAddItemId } = req.query;
        if (!libraryAddItemId) {
            return res.status(400).json({ message: "LibraryCreationId is required" });
        }
        const deleted = await libraryItem.deleteLibrayItem(libraryAddItemId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for library creation ID ${libraryAddItemId}` });
        } else {
            res.status(404).json({ message: "Library not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}