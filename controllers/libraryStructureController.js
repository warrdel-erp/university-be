import * as libraryStructureService  from  "../services/libraryStructureService.js";

export async function addFloor(req, res) {
    const {name,campusId,instituteId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    try {
        if(!(name && campusId && instituteId)){
           return res.status(400).send('floor Name and campusId is required')
        }
        const floor = await libraryStructureService.addFloor(req.body,createdBy,updatedBy,universityId);
        res.status(201).json({ message: "Data added successfully", floor });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllFloor(req, res) {
    const universityId = req.user.universityId;
    try {
        const floor = await libraryStructureService.getFloorDetails(universityId);
        res.status(200).json(floor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleFloorDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { libraryFloorId } = req.query;
        const floor = await libraryStructureService.getSingleFloorDetails(libraryFloorId,universityId);
        if (floor) {
            res.status(200).json(floor);
        } else {
            res.status(404).json({ message: "floor not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateFloor(req, res) {
    try {
        const {libraryFloorId} = req.body
        if(!(libraryFloorId)){
            return res.status(400).send('libraryFloorId is required')
        }
        const updatedBy = req.user.userId;
        const updatedFloor = await libraryStructureService.updateFloor(libraryFloorId, req.body,updatedBy);
            res.status(200).json({message: "floor update succesfully" ,updatedFloor});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteFloor(req, res) {
    try {
        const { libraryFloorId } = req.query;
        if (!libraryFloorId) {
            return res.status(400).json({ message: "libraryFloorId is required" });
        }
        const deleted = await libraryStructureService.deleteFloor(libraryFloorId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for floor ID ${libraryFloorId}` });
        } else {
            res.status(404).json({ message: "floor not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function addAisle(req, res) {
    try {
        const { name, libraryFloorId } = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;

        if (!(name && libraryFloorId)) {
            return res.status(400).send("Aisle name & libraryFloorId are required");
        }

        const aisle = await libraryStructureService.addAisle(req.body, createdBy, updatedBy);
        res.status(201).json({ message: "Aisle added successfully", aisle });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllAisle(req, res) {
        const universityId = req.user.universityId;
    try {
        const data = await libraryStructureService.getAisleDetails(universityId);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function getSingleAisleDetails(req, res) {
    try {
        const { libraryAisleId } = req.query;
        const result = await libraryStructureService.getSingleAisle(libraryAisleId);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function updateAisle(req, res) {
    try {
        const { libraryAisleId } = req.body;
        const updatedBy = req.user.userId;

        if (!libraryAisleId) {
            return res.status(400).send("libraryAisleId is required");
        }

        const result = await libraryStructureService.updateAisle(libraryAisleId, req.body, updatedBy);
        res.status(200).json({ message: "Aisle updated successfully", result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function deleteAisle(req, res) {
    try {
        const { libraryAisleId } = req.query;
        const result = await libraryStructureService.deleteAisle(libraryAisleId);
        res.status(200).json({ message: "Aisle deleted", result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function addRack(req, res) {
    try {
        const { name, libraryAisleId } = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;

        if (!(name && libraryAisleId)) {
            return res.status(400).send("Rack name & libraryAisleId are required");
        }

        const rack = await libraryStructureService.addRack(req.body, createdBy, updatedBy);
        res.status(201).json({ message: "Rack added", rack });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllRack(req, res) {
    try {
        const data = await libraryStructureService.getRackDetails();
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function getSingleRackDetails(req, res) {
    try {
        const { libraryRackId } = req.query;
        const result = await libraryStructureService.getSingleRack(libraryRackId);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function updateRack(req, res) {
    try {
        const { libraryRackId } = req.body;
        const updatedBy = req.user.userId;

        if (!libraryRackId) {
            return res.status(400).send("libraryRackId is required");
        }

        const result = await libraryStructureService.updateRack(libraryRackId, req.body, updatedBy);
        res.status(200).json({ message: "Rack updated successfully", result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function deleteRack(req, res) {
    try {
        const { libraryRackId } = req.query;
        const result = await libraryStructureService.deleteRack(libraryRackId);
        res.status(200).json({ message: "Rack deleted", result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function addRow(req, res) {
    try {
        const { name, libraryRackId } = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;

        if (!(name && libraryRackId)) {
            return res.status(400).send("Row name & libraryRackId are required");
        }

        const row = await libraryStructureService.addRow(req.body, createdBy, updatedBy);
        res.status(201).json({ message: "Row added", row });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllRow(req, res) {
    try {
        const data = await libraryStructureService.getRowDetails();
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function getSingleRowDetails(req, res) {
    try {
        const { libraryRowId } = req.query;
        const result = await libraryStructureService.getSingleRow(libraryRowId);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function updateRow(req, res) {
    try {
        const { libraryRowId } = req.body;
        const updatedBy = req.user.userId;

        if (!libraryRowId) {
            return res.status(400).send("libraryRowId is required");
        }

        const result = await libraryStructureService.updateRow(libraryRowId, req.body, updatedBy);
        res.status(200).json({ message: "Row updated successfully", result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function deleteRow(req, res) {
    try {
        const { libraryRowId } = req.query;
        const result = await libraryStructureService.deleteRow(libraryRowId);
        res.status(200).json({ message: "Row deleted", result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}