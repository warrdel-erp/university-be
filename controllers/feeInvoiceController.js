import * as feeInvoiceCreation  from  "../services/feeInvoiceServices.js";

export async function addFeeInvoice(req, res) {
    const {classStudentMapperId,feeGroupId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(classStudentMapperId && feeGroupId)){
           return res.status(400).send('classStudentMapperId and feeGroupId is required')
        }
        const feeInvoice = await feeInvoiceCreation.addFeeInvoice(req.body,createdBy,updatedBy);
        res.status(201).json({ message: "Data added successfully", feeInvoice });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllFeeInvoice(req, res) {
    const universityId = req.user.universityId;
    const {acedmicYearId} = req.query
    try {
        const feeInvoice = await feeInvoiceCreation.getFeeInvoiceDetails(universityId,acedmicYearId);
        res.status(200).json(feeInvoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleFeeInvoiceDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { feeInvoiceId } = req.query;
        const feeInvoice = await feeInvoiceCreation.getSingleFeeInvoiceDetails(feeInvoiceId,universityId);
        if (feeInvoice) {
            res.status(200).json(feeInvoice);
        } else {
            res.status(404).json({ message: "FeeInvoice not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateFeeInvoice(req, res) {
    try {
        const {feeInvoiceId,feeGroupId,classStudentMapperId} = req.body
        if(!(feeInvoiceId && feeGroupId && classStudentMapperId)){
            return res.status(400).send('FeeInvoiceId , feeGroupId abd classStudentMapperId is required')
         }
         const updatedBy = req.user.userId;
        const updatedFeeInvoice = await feeInvoiceCreation.updateFeeInvoice(feeInvoiceId, req.body,updatedBy);
            res.status(200).json({message: "FeeInvoice update succesfully" ,updatedFeeInvoice});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteFeeInvoice(req, res) {
    try {
        const { feeInvoiceId } = req.query;
        if (!feeInvoiceId) {
            return res.status(400).json({ message: "FeeInvoiceId is required" });
        }
        const deleted = await feeInvoiceCreation.deleteFeeInvoice(feeInvoiceId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for FeeInvoice ID ${feeInvoiceId}` });
        } else {
            res.status(404).json({ message: "FeeInvoice not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}