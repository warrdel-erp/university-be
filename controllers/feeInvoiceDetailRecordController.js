import * as feeInvoiceRecordService  from  "../services/feeInvoiceDetailRecordService.js";

export async function addFeeInvoiceDetailRecord(req, res) {
  const { studentInvoiceMapperId } = req.body;
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  const instituteId = req.user.instituteId;

  try {
    if (!studentInvoiceMapperId   ) {
      return res.status(400).json({ error: "studentInvoiceMapperId is required" });
    }

    const feeInvoice = await feeInvoiceRecordService.addFeeInvoiceDetailRecord(req.body,createdBy,updatedBy,instituteId);
    return res.status(201).json({
      message: "Data added successfully",
      feeInvoice
    });
  } catch (error) {
    console.error("Error in addFeeInvoiceDetailRecord:", error);
    return res.status(500).json({ error: error.message });
  }
};

export async function getAllFeeInvoiceDetailRecord(req, res) {
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role;
    const {acedmicYearId} = req.query
    try {
        const feeInvoice = await feeInvoiceRecordService.getAllFeeInvoiceDetailRecord(universityId,acedmicYearId,instituteId,role);
        res.status(200).json(feeInvoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getSingleFeeInvoiceDetailRecord(req, res) {
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
};

export async function updateFeeInvoiceDetailRecord(req, res) {
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
};

export async function deleteFeeInvoiceDetailRecord(req, res) {
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
};
