import * as invoice  from  "../services/studentInvoiceService.js";

export async function getStudentCount(req, res) {
    let { type } = req.query;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role; 
    try {
        // If type is not provided or empty, treat it as "total"
        if (!type || type.trim() === '') {
            type = 'total';
        }

        const studentCount = await invoice.getStudentCount(type, universityId, instituteId,role);
        res.status(200).json({ message: "count", studentCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


export async function activeInvoice(req, res) {
    const universityId = req.user.universityId;  
    const data = req.body
    try {
        const feePlans = await invoice.updateInvoices(universityId,data);
        res.status(200).json(feePlans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllActiveInvoice(req, res) {
    const universityId = req.user.universityId;
    console.log(`>>>>universityId`,universityId)
    try {
        const getAllActive = await invoice.getAllActiveInvoice(universityId);
        if (getAllActive) {
            res.status(200).json(getAllActive);
        } else {
            res.status(404).json({ message: "active all not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// export async function updateFeePlan(req, res) {
//     try {
//         const {poId} = req.body
//         if(!(poId)){
//             return res.status(400).send('poId is required')
//          }
//          const updatedBy = req.user.userId;
//         const updatedFeePlan = await feePlan.updateFeePlan(poId, req.body,updatedBy);
//             res.status(200).json({message: "feePlan update succesfully" ,updatedFeePlan});
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// }

// export async function deleteFeePlan(req, res) {
//     try {
//         const { poId } = req.query;
//         if (!poId) {
//             return res.status(400).json({ message: "poId is required" });
//         }
//         const deleted = await feePlan.deleteFeePlan(poId);
//         if (deleted) {
//             res.status(200).json({ message: `Delete successful for feePlan ID ${poId}` });
//         } else {
//             res.status(404).json({ message: "feePlan not found" });
//         }
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// }