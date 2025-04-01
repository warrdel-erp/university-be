import * as buildingCreation  from  "../services/buildingServices.js";

export async function addbuilding(req, res) {
    const {name,campusId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(name && campusId)){
           return res.status(400).send('building Name and campusId is required')
        }
        const building = await buildingCreation.addbuilding(req.body,createdBy,updatedBy);
        res.status(201).json({ message: "Data added successfully", building });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllbuilding(req, res) {
    const universityId = req.user.universityId;
    try {
        const building = await buildingCreation.getbuildingDetails(universityId);
        res.status(200).json(building);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSinglebuildingDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { buildingId } = req.query;
        const building = await buildingCreation.getSinglebuildingDetails(buildingId,universityId);
        if (building) {
            res.status(200).json(building);
        } else {
            res.status(404).json({ message: "building not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updatebuilding(req, res) {
    try {
        const {buildingId} = req.body
        if(!(buildingId)){
            return res.status(400).send('buildingId is required')
         }
         const updatedBy = req.user.userId;
        const updatedbuilding = await buildingCreation.updatebuilding(buildingId, req.body,updatedBy);
            res.status(200).json({message: "building update succesfully" ,updatedbuilding});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deletebuilding(req, res) {
    try {
        const { buildingId } = req.query;
        if (!buildingId) {
            return res.status(400).json({ message: "buildingId is required" });
        }
        const deleted = await buildingCreation.deletebuilding(buildingId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for building ID ${buildingId}` });
        } else {
            res.status(404).json({ message: "building not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}