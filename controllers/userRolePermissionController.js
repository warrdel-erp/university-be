import * as UserRolePermissionCreation  from  "../services/userRolePermissionService.js";

export async function addUserRolePermission(req, res) {
    const {userId,roleId,permission,scope} = req.body
    try {
        if(!(permission && roleId && userId && scope)){
           return res.status(400).send('userId, permission, scope and roleId are required')
        }
        const UserRolePermission = await UserRolePermissionCreation.addUserRolePermission(req.body);
        res.status(201).json({ message: "Data added successfully", UserRolePermission });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllUserRolePermission(req, res) {
    try {
        const UserRolePermission = await UserRolePermissionCreation.getUserRolePermissionDetails();
        res.status(200).json(UserRolePermission);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleUserRolePermissionDetails(req, res) {
    try {
        const { userRolePermissionId } = req.query;
        const UserRolePermission = await UserRolePermissionCreation.getSingleUserRolePermissionDetails(userRolePermissionId);
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
        const {userRolePermissionId,permission,roleId,userId,scope} = req.body
        if(!(userRolePermissionId && permission && roleId && userId && scope)){
            return res.status(400).send('userRolePermissionId, permission, scope, userId and roleId are required')
         }
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