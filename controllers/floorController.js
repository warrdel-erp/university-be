import * as floorCreation  from  "../services/floorServices.js";

export async function addfloor(req, res) {
    const {name} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(name)){
           return res.status(400).send('Fee Group Name is required')
        }
        const floor = await floorCreation.addfloor(req.body,createdBy,updatedBy);
        res.status(201).json({ message: "Data added successfully", floor });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllfloor(req, res) {
    const universityId = req.user.universityId;
    try {
        const floor = await floorCreation.getfloorDetails(universityId);
        res.status(200).json(floor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSinglefloorDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { floorId } = req.query;
        const floor = await floorCreation.getSinglefloorDetails(floorId,universityId);
        if (floor) {
            res.status(200).json(floor);
        } else {
            res.status(404).json({ message: "floor not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updatefloor(req, res) {
    try {
        const {floorId} = req.body
        if(!(floorId)){
            return res.status(400).send('floorId is required')
         }
         const updatedBy = req.user.userId;
        const updatedfloor = await floorCreation.updatefloor(floorId, req.body,updatedBy);
            res.status(200).json({message: "floor update succesfully" ,updatedfloor});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deletefloor(req, res) {
    try {
        const { floorId } = req.query;
        if (!floorId) {
            return res.status(400).json({ message: "floorId is required" });
        }
        const deleted = await floorCreation.deletefloor(floorId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for floor ID ${floorId}` });
        } else {
            res.status(404).json({ message: "floor not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}