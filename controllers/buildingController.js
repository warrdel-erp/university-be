import * as buildingCreation  from  "../services/buildingServices.js";

export async function addbuilding(req, res) {
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        const building = await buildingCreation.addbuilding(req.body, req.user, createdBy, updatedBy);
        res.status(201).json({ message: "Data added successfully", building });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllbuilding(req, res) {
    try {
        const building = await buildingCreation.getbuildingDetails();
        res.status(200).json(building);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSinglebuildingDetails(req, res) {
    try {
        const { buildingId } = req.query;
        const building = await buildingCreation.getSinglebuildingDetails(buildingId);
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
        const { buildingId } = req.body;
        const updatedBy = req.user.userId;
        const updatedbuilding = await buildingCreation.updatebuilding(buildingId, req.body, updatedBy);
            res.status(200).json({message: "building update succesfully" ,updatedbuilding});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deletebuilding(req, res) {
    try {
        const { buildingId } = req.query;
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

export async function getAllbuildingNested(req, res) {
    try {
        const { buildingType } = req.query;
        const instituteId = req.user.defaultInstituteId;
        const building = await buildingCreation.getAllbuildingNested(buildingType, instituteId);
        res.status(200).json(building);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
