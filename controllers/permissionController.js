import * as PermissionCreation  from  "../services/permissionService.js";

export async function addPermission(req, res) {
    const {permission,moduleName} = req.body
    try {
        if(!(permission && moduleName)){
           return res.status(400).send('Permission & moduleName is required')
        }
        const Permission = await PermissionCreation.addPermission(req.body);
        res.status(201).json({ message: "Data added successfully", Permission });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllPermission(req, res) {
    const universityId = req.user.universityId;
    try {
        const Permission = await PermissionCreation.getPermissionDetails(universityId);
        res.status(200).json(Permission);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSinglePermissionDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { permissionId } = req.query;
        const Permission = await PermissionCreation.getSinglePermissionDetails(permissionId,universityId);
        if (Permission) {
            res.status(200).json(Permission);
        } else {
            res.status(404).json({ message: "Permission not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updatePermission(req, res) {
    try {
        const {permissionId} = req.body
        if(!(permissionId)){
            return res.status(400).send('PermissionId is required')
         }
        //  const updatedBy = req.user.userId;
        const updatedPermission = await PermissionCreation.updatePermission(permissionId, req.body);
            res.status(200).json({message: "Permission update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deletePermission(req, res) {
    try {
        const { permissionId } = req.query;
        if (!permissionId) {
            return res.status(400).json({ message: "PermissionId is required" });
        }
        const deleted = await PermissionCreation.deletePermission(permissionId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for Permission ID ${permissionId}` });
        } else {
            res.status(404).json({ message: "Permission not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}