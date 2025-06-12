import * as poCreation  from  "../services/poServices.js";

export async function addPo(req, res) {
    console.log(`>>>>>>>req.body`,req.body);
    
    const {courseId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if(!(courseId)){
           return res.status(400).send('courseId is required')
        }
        const Po = await poCreation.addPo(req.body,createdBy,updatedBy,universityId,instituteId);
        res.status(201).json({ message: "Data added successfully", Po });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllPo(req, res) {
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role;    
    const {acedmicYearId} = req.query
    try {
        const Po = await poCreation.getPoDetails(universityId,instituteId,role,acedmicYearId);
        res.status(200).json(Po);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSinglePoDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { poId } = req.query;
        const Po = await poCreation.getSinglePoDetails(poId,universityId);
        if (Po) {
            res.status(200).json(Po);
        } else {
            res.status(404).json({ message: "Po not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updatePo(req, res) {
    try {
        const {poId} = req.body
        if(!(poId)){
            return res.status(400).send('poId is required')
         }
         const updatedBy = req.user.userId;
        const updatedPo = await poCreation.updatePo(poId, req.body,updatedBy);
            res.status(200).json({message: "Po update succesfully" ,updatedPo});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deletePo(req, res) {
    try {
        const { poId } = req.query;
        if (!poId) {
            return res.status(400).json({ message: "poId is required" });
        }
        const deleted = await poCreation.deletePo(poId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for Po ID ${poId}` });
        } else {
            res.status(404).json({ message: "Po not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}