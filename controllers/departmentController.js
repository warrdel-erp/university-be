import * as DepartmentCreation  from  "../services/departmentService.js";

export async function addDepartment(req, res) {
    const {subAccountId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    try {
        if(!(subAccountId)){
           return res.status(400).send('subAccountId is required')
        }
        const departmentDetails = await DepartmentCreation.addDepartment(req.body,createdBy,updatedBy,universityId);
        res.status(201).json({ message: "Data added successfully", departmentDetails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllDepartment(req, res) {
    const universityId = req.user.universityId;
    try {
        const departmentDetails = await DepartmentCreation.getDepartmentDetails(universityId);
        res.status(200).json(departmentDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleDepartmentDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { departmentId } = req.query;
        const departmentDetails = await DepartmentCreation.getSingleDepartmentDetails(departmentId,universityId);
        if (departmentDetails) {
            res.status(200).json(departmentDetails);
        } else {
            res.status(404).json({ message: "departmentDetails not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateDepartment(req, res) {
    try {
        const {departmentId} = req.body
        if(!(departmentId)){
            return res.status(400).send('departmentId is required')
         }
         const updatedBy = req.user.userId;
        const updatedDepartment = await DepartmentCreation.updateDepartment(departmentId, req.body,updatedBy);
            res.status(200).json({message: "departmentDetails update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteDepartment(req, res) {
    try {
        const { departmentId } = req.query;
        if (!departmentId) {
            return res.status(400).json({ message: "departmentId is required" });
        }
        const deleted = await DepartmentCreation.deleteDepartment(departmentId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for departmentDetails ID ${departmentId}` });
        } else {
            res.status(404).json({ message: "departmentDetails not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllAccount(req, res) {
    const universityId = req.user.universityId;
    try {
        const departmentDetails = await DepartmentCreation.getAllAccount();
        res.status(200).json(departmentDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}