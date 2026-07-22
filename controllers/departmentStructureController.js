import * as departmentStructureCreation from "../services/departmentStructureServices.js";

export async function addDepartmentStructure(req, res) {
    const { accountId, subAccountId, parentAccountId } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if (!accountId) {
            return res.status(400).send('accountId is required');
        }
        const payload = {
            ...req.body,
            accountId: Number(accountId),
            subAccountId: subAccountId == null ? null : Number(subAccountId),
            parentAccountId: parentAccountId == null ? null : Number(parentAccountId),
        };
        const departmentStructure = await departmentStructureCreation.addDepartmentStructure(payload, createdBy, updatedBy);
        res.status(201).json({ message: "Data added successfully", departmentStructure });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAlldepartmentStructure(req, res) {
    try {
        const departmentStructureDetails = await departmentStructureCreation.getdepartmentStructureDetails();
        res.status(200).json(departmentStructureDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingledepartmentStructureDetails(req, res) {
    try {
        const { departmentStructureId } = req.query;
        const departmentStructure = await departmentStructureCreation.getSingledepartmentStructureDetails(departmentStructureId);
        if (departmentStructure) {
            res.status(200).json(departmentStructure);
        } else {
            res.status(404).json({ message: "departmentStructure not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updatedepartmentStructure(req, res) {
    try {
        const { departmentStructureId } = req.body;
        if (!departmentStructureId) {
            return res.status(400).send('departmentStructureId is required');
        }
        const updatedBy = req.user.userId;
        await departmentStructureCreation.updatedepartmentStructure(departmentStructureId, req.body, updatedBy);
        res.status(200).json({ message: "departmentStructure update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deletedepartmentStructure(req, res) {
    try {
        const { departmentStructureId } = req.query;
        if (!departmentStructureId) {
            return res.status(400).json({ message: "departmentStructureId is required" });
        }
        const deleted = await departmentStructureCreation.deletedepartmentStructure(departmentStructureId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for departmentStructure ID ${departmentStructureId}` });
        } else {
            res.status(404).json({ message: "departmentStructure not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
