import * as FeeInvoiceDetailsCreation  from  "../services/feeInvoiceDetailServices.js";

export async function addFeeInvoiceDetails(req, res) {
    const {feeInvoiceId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(feeInvoiceId)){
           return res.status(400).send('feeInvoiceId is required')
        }
        const feeInvoiceDetails = await FeeInvoiceDetailsCreation.addFeeInvoiceDetails(req.body,createdBy,updatedBy);
        res.status(201).json({ message: "Data added successfully", feeInvoiceDetails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllFeeInvoiceDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const FeeInvoiceDetails = await FeeInvoiceDetailsCreation.getFeeInvoiceDetailsDetails(universityId);
        res.status(200).json(FeeInvoiceDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleFeeInvoiceDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { feeInvoiceDetailsId } = req.query;
        const feeInvoiceDetails = await FeeInvoiceDetailsCreation.getSingleFeeInvoiceDetails(feeInvoiceDetailsId,universityId);
        if (feeInvoiceDetails) {
            res.status(200).json(feeInvoiceDetails);
        } else {
            res.status(404).json({ message: "FeeInvoiceDetails not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateFeeInvoiceDetails(req, res) {
    try {
        const {feeInvoiceDetailsId,feeInvoiceId} = req.body
        if(!(feeInvoiceDetailsId && feeInvoiceId)){
            return res.status(400).send('feeInvoiceDetailsId and feeInvoiceId is required')
         }
         const updatedBy = req.user.userId;
        const updatedFeeInvoiceDetails = await FeeInvoiceDetailsCreation.updateFeeInvoiceDetails(feeInvoiceDetailsId, req.body,updatedBy);
            res.status(200).json({message: "FeeInvoiceDetails update succesfully" ,updatedFeeInvoiceDetails});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteFeeInvoiceDetails(req, res) {
    try {
        const { feeInvoiceDetailsId } = req.query;
        if (!feeInvoiceDetailsId) {
            return res.status(400).json({ message: "feeInvoiceDetailsId is required" });
        }
        const deleted = await FeeInvoiceDetailsCreation.deleteFeeInvoiceDetails(feeInvoiceDetailsId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for FeeInvoiceDetails ID ${feeInvoiceDetailsId}` });
        } else {
            res.status(404).json({ message: "FeeInvoiceDetails not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}