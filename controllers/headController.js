import * as headCreation  from  "../services/headServices.js";

export async function addHead(req, res) {
    const {campusId,instituteId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    try {
        if(!(campusId && instituteId)){
           return res.status(400).send('campusId,instituteId is required')
        }
        const headDetails = await headCreation.addHead(req.body,createdBy,updatedBy,universityId);
        res.status(201).json({ message: "Data added successfully", headDetails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllHead(req, res) {
    const universityId = req.user.universityId;
    try {
        const headDetails = await headCreation.getHeadDetails(universityId);
        res.status(200).json(headDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleHeadDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { headId } = req.query;
        const headDetails = await headCreation.getSingleHeadDetails(headId,universityId);
        if (headDetails) {
            res.status(200).json(headDetails);
        } else {
            res.status(404).json({ message: "headDetails not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateHead(req, res) {
    try {
        const {headId} = req.body
        if(!(headId)){
            return res.status(400).send('HeadId is required')
         }
         const updatedBy = req.user.userId;
        const updatedHead = await headCreation.updateHead(headId, req.body,updatedBy);
            res.status(200).json({message: "headDetails update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteHead(req, res) {
    try {
        const { headId } = req.query;
        if (!headId) {
            return res.status(400).json({ message: "headId is required" });
        }
        const deleted = await headCreation.deleteHead(headId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for headDetails ID ${headId}` });
        } else {
            res.status(404).json({ message: "headDetails not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}