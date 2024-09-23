import * as libraryCreation  from  "../services/libraryCreationServices.js";

export async function addLibrary(req, res) {
    const {instituteId,name} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(instituteId && name)){
           return res.status(400).send('instituteId and name is required')
        }
        const newLibrary = await libraryCreation.addLibrary(req.body,createdBy,updatedBy);
        res.status(201).json({ message: "Data Add Successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getLibraryDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const libraries = await libraryCreation.getLibraryDetails(universityId);
        res.status(200).json(libraries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleLibraryDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { libraryCreationId } = req.query;
        const library = await libraryCreation.getSingleLibraryDetails(libraryCreationId,universityId);
        if (library) {
            res.status(200).json(library);
        } else {
            res.status(404).json({ message: "Library not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateLibray(req, res) {
    try {
        const {libraryCreationId} = req.body
        if(!(libraryCreationId)){
            return res.status(400).send('libraryCreationId is required')
         }
         const updatedBy = req.user.userId;
        const updatedLibrary = await libraryCreation.updateLibrary(libraryCreationId, req.body,updatedBy);
            res.status(200).json({message: "Library Creation & library Authority update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteLibray(req, res) {
    try {
        const { libraryCreationId } = req.query;
        if (!libraryCreationId) {
            return res.status(400).json({ message: "LibraryCreationId is required" });
        }
        const deleted = await libraryCreation.deleteLibray(libraryCreationId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for library creation ID ${libraryCreationId}` });
        } else {
            res.status(404).json({ message: "Library not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}