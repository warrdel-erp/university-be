import * as RolePermissionsCreation  from  "../services/rolePermissionsService.js";

export async function addRolePermissions(req, res) {
    const {roleId,permissionId} = req.body
    // const createdBy = req.user.userId;
    // const updatedBy = req.user.userId;
    try {
        if(!(permissionId && roleId)){
           return res.status(400).send('permissionId && roleId is required')
        }
        const RolePermissions = await RolePermissionsCreation.addRolePermissions(req.body);
        res.status(201).json({ message: "Data added successfully", RolePermissions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllRolePermissions(req, res) {
    try {
        const RolePermissions = await RolePermissionsCreation.getRolePermissionsDetails();
        res.status(200).json(RolePermissions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleRolePermissionsDetails(req, res) {
    try {
        const { rolePermissionsId } = req.query;
        const RolePermissions = await RolePermissionsCreation.getSingleRolePermissionsDetails(rolePermissionsId);
        if (RolePermissions) {
            res.status(200).json(RolePermissions);
        } else {
            res.status(404).json({ message: "RolePermissions not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateRolePermissions(req, res) {
    try {
        const {rolePermissionsId,permissionId,roleId} = req.body
        if(!(rolePermissionsId && permissionId && roleId)){
            return res.status(400).send('rolePermissionsId,permissionId and roleId is required')
         }
        //  const updatedBy = req.user.userId;
        const updatedRolePermissions = await RolePermissionsCreation.updateRolePermissions(rolePermissionsId, req.body);
            res.status(200).json({message: "RolePermissions update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteRolePermissions(req, res) {
    try {
        const { rolePermissionsId } = req.query;
        if (!rolePermissionsId) {
            return res.status(400).json({ message: "RolePermissionsId is required" });
        }
        const deleted = await RolePermissionsCreation.deleteRolePermissions(rolePermissionsId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for RolePermissions ID ${rolePermissionsId}` });
        } else {
            res.status(404).json({ message: "RolePermissions not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}