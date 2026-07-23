import * as DepartmentCreation from '../services/departmentService.js';

function isTenantScopeError(message = '') {
    return (
        message.includes('institute scope') ||
        message.includes('university scope')
    );
}

export async function addDepartment(req, res) {
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        const departmentDetails = await DepartmentCreation.addDepartment(req.body, createdBy, updatedBy);
        res.status(201).json({ message: 'Data added successfully', departmentDetails });
    } catch (error) {
        if (isTenantScopeError(error.message)) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ error: error.message });
    }
}

export async function getAllDepartment(req, res) {
    try {
        const departmentDetails = await DepartmentCreation.getDepartmentDetails();
        res.status(200).json(departmentDetails);
    } catch (error) {
        if (isTenantScopeError(error.message)) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleDepartmentDetails(req, res) {
    try {
        const { departmentId } = req.query;
        const departmentDetails = await DepartmentCreation.getSingleDepartmentDetails(departmentId);
        if (departmentDetails) {
            res.status(200).json(departmentDetails);
        } else {
            res.status(404).json({ message: 'departmentDetails not found' });
        }
    } catch (error) {
        if (isTenantScopeError(error.message)) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ error: error.message });
    }
}

export async function updateDepartment(req, res) {
    try {
        const { departmentId, ...updateData } = req.body;
        const updatedBy = req.user.userId;
        const updated = await DepartmentCreation.updateDepartment(departmentId, updateData, updatedBy);
        if (!updated) {
            return res.status(404).json({ message: 'departmentDetails not found' });
        }
        res.status(200).json({ message: 'departmentDetails update succesfully' });
    } catch (error) {
        if (isTenantScopeError(error.message)) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ error: error.message });
    }
}

export async function deleteDepartment(req, res) {
    try {
        const { departmentId } = req.query;
        const deleted = await DepartmentCreation.deleteDepartment(departmentId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for departmentDetails ID ${departmentId}` });
        } else {
            res.status(404).json({ message: 'departmentDetails not found' });
        }
    } catch (error) {
        if (isTenantScopeError(error.message)) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ error: error.message });
    }
}

export async function getDepartmentByIdEmployee(req, res) {
    try {
        const { departmentId } = req.query;
        const departmentDetails = await DepartmentCreation.getDepartmentByIdEmployee(departmentId);
        if (departmentDetails) {
            res.status(200).json(departmentDetails);
        } else {
            res.status(404).json({ message: 'departmentDetails not found' });
        }
    } catch (error) {
        if (isTenantScopeError(error.message)) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ error: error.message });
    }
}
