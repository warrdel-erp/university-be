import * as feePlan  from  "../services/feePlanServices.js";

export async function addFeePlan(req, res) { 
    console.log(`>>>>>>`,req.body);
       
    const {name} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if(!(name)){
           return res.status(400).send('fee plan name is required')
        }
        const feePlanData = await feePlan.addFeePlan(req.body,createdBy,updatedBy,universityId,instituteId);
        res.status(201).json({ message: "Data added successfully", feePlanData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllFeePlan(req, res) {
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role;    
    // const {acedmicYearId} = req.query
    try {
        const feePlans = await feePlan.getFeePlanDetails(universityId,instituteId,role);
        res.status(200).json(feePlans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleFeePlanDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { poId } = req.query;
        const po = await feePlan.getSingleFeePlanDetails(poId,universityId);
        if (po) {
            res.status(200).json(po);
        } else {
            res.status(404).json({ message: "feePlan not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateFeePlan(req, res) {
    try {
        const {poId} = req.body
        if(!(poId)){
            return res.status(400).send('poId is required')
         }
         const updatedBy = req.user.userId;
        const updatedFeePlan = await feePlan.updateFeePlan(poId, req.body,updatedBy);
            res.status(200).json({message: "feePlan update succesfully" ,updatedFeePlan});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteFeePlan(req, res) {
    try {
        const { poId } = req.query;
        if (!poId) {
            return res.status(400).json({ message: "poId is required" });
        }
        const deleted = await feePlan.deleteFeePlan(poId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for feePlan ID ${poId}` });
        } else {
            res.status(404).json({ message: "feePlan not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}