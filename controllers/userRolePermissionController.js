import * as UserRolePermissionCreation  from  "../services/userRolePermissionService.js";

export async function addUserRolePermission(req, res) {
    const {userId,roleId,permissionId} = req.body
    // const createdBy = req.user.userId;
    // const updatedBy = req.user.userId;
    try {
        if(!(permissionId && roleId && userId)){
           return res.status(400).send('userid,permissionId && roleId is required')
        }
        const UserRolePermission = await UserRolePermissionCreation.addUserRolePermission(req.body);
        res.status(201).json({ message: "Data added successfully", UserRolePermission });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllUserRolePermission(req, res) {
    const universityId = req.user.universityId;
    try {
        const UserRolePermission = await UserRolePermissionCreation.getUserRolePermissionDetails(universityId);
        res.status(200).json(UserRolePermission);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleUserRolePermissionDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { userRolePermissionId } = req.query;
        const UserRolePermission = await UserRolePermissionCreation.getSingleUserRolePermissionDetails(userRolePermissionId,universityId);
        if (UserRolePermission) {
            res.status(200).json(UserRolePermission);
        } else {
            res.status(404).json({ message: "UserRolePermission not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateUserRolePermission(req, res) {
    try {
        const {userRolePermissionId,permissionId,roleId,userId} = req.body
        if(!(userRolePermissionId && permissionId && roleId && userId)){
            return res.status(400).send('UserRolePermissionId,permissionId,userId and roleId is required')
         }
        //  const updatedBy = req.user.userId;
        const updatedUserRolePermission = await UserRolePermissionCreation.updateUserRolePermission(userRolePermissionId, req.body);
            res.status(200).json({message: "UserRolePermission update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteUserRolePermission(req, res) {
    try {
        const { userRolePermissionId } = req.query;
        if (!userRolePermissionId) {
            return res.status(400).json({ message: "UserRolePermissionId is required" });
        }
        const deleted = await UserRolePermissionCreation.deleteUserRolePermission(userRolePermissionId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for UserRolePermission ID ${userRolePermissionId}` });
        } else {
            res.status(404).json({ message: "UserRolePermission not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}