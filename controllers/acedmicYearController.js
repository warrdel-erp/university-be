import * as acedmicYearCreation  from  "../services/acedmicYearServices.js";

export async function addacedmicYear(req, res) {
    const {year} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    try {
        if(!(year)){
           return res.status(400).send('year is required')
        }
        const acedmicYear = await acedmicYearCreation.addacedmicYear(req.body,createdBy,updatedBy,universityId);
        res.status(201).json({ message: "Data added successfully", acedmicYear });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllacedmicYear(req, res) {
    const universityId = req.user.universityId;
    try {
        const acedmicYear = await acedmicYearCreation.getacedmicYearDetails(universityId);
        res.status(200).json(acedmicYear);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleacedmicYearDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { acedmicYearId } = req.query;
        const acedmicYear = await acedmicYearCreation.getSingleacedmicYearDetails(acedmicYearId,universityId);
        if (acedmicYear) {
            res.status(200).json(acedmicYear);
        } else {
            res.status(404).json({ message: "acedmicYear not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateacedmicYear(req, res) {
    try {
         const updatedBy = req.user.userId;
        const updatedacedmicYear = await acedmicYearCreation.updateacedmicYear(req.body,updatedBy);
            res.status(200).json({message: "acedmicYear update succesfully" ,updatedacedmicYear});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteacedmicYear(req, res) {
    try {
        const { acedmicYearId } = req.query;
        if (!acedmicYearId) {
            return res.status(400).json({ message: "acedmicYearId is required" });
        }
        const deleted = await acedmicYearCreation.deleteacedmicYear(acedmicYearId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for acedmicYear ID ${acedmicYearId}` });
        } else {
            res.status(404).json({ message: "acedmicYear not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllActiveAcedmicYear(req, res) {
    const universityId = req.user.universityId;
    try {
        const acedmicYear = await acedmicYearCreation.getAllActiveAcedmicYear(universityId);
        res.status(200).json(acedmicYear);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function activateAcedmicYear(req, res) {
       try {
   const {acedmicYearId} = req.query
        if(!(acedmicYearId)){
            return res.status(400).send('acedmicYearId is required')
         }
        const updatedBy = req.user.userId; 
        
        const acedmicYear = await acedmicYearCreation.activateAcedmicYear(acedmicYearId,updatedBy);
        res.status(201).json({ message: "Data added successfully", acedmicYear });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function newActivateAndCopyData(req, res) {
       try {
   const {acedmicYearId} = req.body
        if(!(acedmicYearId)){
            return res.status(400).send('acedmicYearId is required')
         }
        const updatedBy = req.user.userId; 
        const createdBy = req.user.userId;
        const universityId = req.user.universityId;
        const instituteId = req.user.instituteId;
        const acedmicYear = await acedmicYearCreation.newActivateAndCopyData(req.body,universityId,instituteId,createdBy,updatedBy);
        res.status(201).json({ message: "copy data added successfully", acedmicYear });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};