import * as StaffCreation  from  "../services/staffServices.js";

export async function addStaff(req, res) {
    const {departmentId,employeeId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    try {
        if(!(departmentId && employeeId)){
           return res.status(400).send('departmentId,employeeId is required')
        }
        const Staff = await StaffCreation.addStaff(req.body,createdBy,updatedBy,universityId);
        res.status(201).json({ message: "Data added successfully", Staff });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllStaff(req, res) {
    const universityId = req.user.universityId;
    try {
        const staffDetails = await StaffCreation.getStaffDetails(universityId);
        res.status(200).json(staffDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleStaffDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { staffId } = req.query;
        const Staff = await StaffCreation.getSingleStaffDetails(staffId,universityId);
        if (Staff) {
            res.status(200).json(Staff);
        } else {
            res.status(404).json({ message: "Staff not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateStaff(req, res) {
    try {
        const {staffId} = req.body
        if(!(staffId)){
            return res.status(400).send('staffId is required')
         }
         const updatedBy = req.user.userId;
        const updatedStaff = await StaffCreation.updateStaff(staffId, req.body,updatedBy);
            res.status(200).json({message: "Staff update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteStaff(req, res) {
    try {
        const { staffId } = req.query;
        if (!staffId) {
            return res.status(400).json({ message: "staffId is required" });
        }
        const deleted = await StaffCreation.deleteStaff(staffId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for Staff ID ${staffId}` });
        } else {
            res.status(404).json({ message: "Staff not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}