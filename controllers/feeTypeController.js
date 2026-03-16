import * as feeTypeCreation from "../services/feeTypeServices.js";

export async function addFeeType(req, res) {
    const { name } = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if (!(name)) {
            return res.status(400).send('Fee type Name  is required')
        }
        const FeeType = await feeTypeCreation.addFeeType(req.body, createdBy, updatedBy);
        res.status(201).json({ message: "Data added successfully", FeeType });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllFeeType(req, res) {
    const universityId = req.user.universityId;
    const { acedmicYearId } = req.query;
    const instituteId = req.user.defaultInstituteId;
    const role = req.user.role;
    try {
        const FeeType = await feeTypeCreation.getFeeTypeDetails(universityId, acedmicYearId, instituteId, role);
        res.status(200).json(FeeType);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleFeeTypeDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { feeTypeId } = req.query;
        const FeeType = await feeTypeCreation.getSingleFeeTypeDetails(feeTypeId, universityId);
        if (FeeType) {
            res.status(200).json(FeeType);
        } else {
            res.status(404).json({ message: "FeeType not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateFeeType(req, res) {
    try {
        const { feeTypeId, feeGroupId } = req.body
        if (!(feeTypeId && feeGroupId)) {
            return res.status(400).send('FeeTypeId and feeGroupId is required')
        }
        const updatedBy = req.user.userId;
        const updatedFeeType = await feeTypeCreation.updateFeeType(feeTypeId, req.body, updatedBy);
        res.status(200).json({ message: "FeeType update succesfully", updatedFeeType });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteFeeType(req, res) {
    try {
        const { feeTypeId } = req.query;
        if (!feeTypeId) {
            return res.status(400).json({ message: "FeeTypeId is required" });
        }
        const deleted = await feeTypeCreation.deleteFeeType(feeTypeId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for FeeType ID ${feeTypeId}` });
        } else {
            res.status(404).json({ message: "FeeType not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}