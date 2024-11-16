import * as RolePermissionMappingCreation  from  "../services/rolePermissionMappingService.js";

export async function addRolePermissionMapping(req, res) {
    const {roleId,permissionId} = req.body
    // const createdBy = req.user.userId;
    // const updatedBy = req.user.userId;
    try {
        if(!(permissionId && roleId)){
           return res.status(400).send('permissionId && roleId is required')
        }
        const RolePermissionMapping = await RolePermissionMappingCreation.addRolePermissionMapping(req.body);
        res.status(201).json({ message: "Data added successfully", RolePermissionMapping });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllRolePermissionMapping(req, res) {
    const universityId = req.user.universityId;
    try {
        const RolePermissionMapping = await RolePermissionMappingCreation.getRolePermissionMappingDetails(universityId);
        res.status(200).json(RolePermissionMapping);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleRolePermissionMappingDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { rolePermissionMappingId } = req.query;
        const RolePermissionMapping = await RolePermissionMappingCreation.getSingleRolePermissionMappingDetails(rolePermissionMappingId,universityId);
        if (RolePermissionMapping) {
            res.status(200).json(RolePermissionMapping);
        } else {
            res.status(404).json({ message: "RolePermissionMapping not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateRolePermissionMapping(req, res) {
    try {
        const {rolePermissionMappingId,permissionId,roleId} = req.body
        if(!(rolePermissionMappingId && permissionId && roleId)){
            return res.status(400).send('rolePermissionMappingId,permissionId and roleId is required')
         }
        //  const updatedBy = req.user.userId;
        const updatedRolePermissionMapping = await RolePermissionMappingCreation.updateRolePermissionMapping(rolePermissionMappingId, req.body);
            res.status(200).json({message: "RolePermissionMapping update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteRolePermissionMapping(req, res) {
    try {
        const { rolePermissionMappingId } = req.query;
        if (!rolePermissionMappingId) {
            return res.status(400).json({ message: "RolePermissionMappingId is required" });
        }
        const deleted = await RolePermissionMappingCreation.deleteRolePermissionMapping(rolePermissionMappingId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for RolePermissionMapping ID ${rolePermissionMappingId}` });
        } else {
            res.status(404).json({ message: "RolePermissionMapping not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}