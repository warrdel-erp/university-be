import * as service from '../services/userPermissionService.js';

export async function assignPermissions(req, res) {
    try {
        const { userId, permissions } = req.body;

        const result = await service.assignPermissionsToUser(userId, permissions);
        return res.status(200).json({
            success: true,
            message: "Permissions assigned successfully",
            data: result
        });
    } catch (error) {
        console.error("Controller: Error in assignPermissions:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to assign permissions"
        });
    }
}

export async function getPermissions(req, res) {
    try {
        const { userId } = req.user;

        const permissions = await service.getUserPermissions(userId);
        return res.status(200).json({
            success: true,
            data: { permissions }
        });
    } catch (error) {
        console.error("Controller: Error in getPermissions:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch permissions"
        });
    }
}
