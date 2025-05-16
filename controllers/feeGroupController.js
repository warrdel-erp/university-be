import * as FeeGroupCreation  from  "../services/feeGroupServices.js";

export async function addFeeGroup(req, res) {
    const {name,acedmicYearId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(name && acedmicYearId)){
           return res.status(400).send('Fee Group Name and acedmicYearId is required')
        }
        const feeGroup = await FeeGroupCreation.addFeeGroup(req.body,createdBy,updatedBy);
        res.status(201).json({ message: "Data added successfully", feeGroup });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllFeeGroup(req, res) {
    const universityId = req.user.universityId;
    const { acedmicYearId } = req.query;
    try {
        const feeGroup = await FeeGroupCreation.getFeeGroupDetails(universityId,acedmicYearId);
        res.status(200).json(feeGroup);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleFeeGroupDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { feeGroupId } = req.query;
        const FeeGroup = await FeeGroupCreation.getSingleFeeGroupDetails(feeGroupId,universityId);
        if (FeeGroup) {
            res.status(200).json(FeeGroup);
        } else {
            res.status(404).json({ message: "FeeGroup not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateFeeGroup(req, res) {
    try {
        const {feeGroupId} = req.body
        if(!(feeGroupId)){
            return res.status(400).send('feeGroupId is required')
         }
         const updatedBy = req.user.userId;
        const updatedFeeGroup = await FeeGroupCreation.updateFeeGroup(feeGroupId, req.body,updatedBy);
            res.status(200).json({message: "FeeGroup update succesfully" ,updatedFeeGroup});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteFeeGroup(req, res) {
    try {
        const { feeGroupId } = req.query;
        if (!feeGroupId) {
            return res.status(400).json({ message: "feeGroupId is required" });
        }
        const deleted = await FeeGroupCreation.deleteFeeGroup(feeGroupId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for FeeGroup ID ${feeGroupId}` });
        } else {
            res.status(404).json({ message: "FeeGroup not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}