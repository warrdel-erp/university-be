import * as RoleCreation  from  "../services/roleServices.js";

export async function addRole(req, res) {
    const {role} = req.body
    try {
        if(!(role)){
           return res.status(400).send('role is required')
        }
        const Role = await RoleCreation.addRole(req.body);
        res.status(201).json({ message: "Data added successfully", Role });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllRole(req, res) {
    try {
        const role = await RoleCreation.getRoleDetails();
        res.status(200).json(role);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleRoleDetails(req, res) {
    try {
        const { roleId } = req.query;
        const Role = await RoleCreation.getSingleRoleDetails(roleId);
        if (Role) {
            res.status(200).json(Role);
        } else {
            res.status(404).json({ message: "Role not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateRole(req, res) {
    try {
        const {roleId} = req.body
        if(!(roleId)){
            return res.status(400).send('roleId is required')
         }
        const updatedRole = await RoleCreation.updateRole(roleId, req.body);
        res.status(200).json({message: "Role update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteRole(req, res) {
    try {
        const { roleId } = req.query;
        if (!roleId) {
            return res.status(400).json({ message: "roleId is required" });
        }
        const deleted = await RoleCreation.deleteRole(roleId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for Role ID ${roleId}` });
        } else {
            res.status(404).json({ message: "Role not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getRolePermissions(req, res) {
    try {
        const { roleId } = req.params;
        if (!roleId) {
            return res.status(400).send('roleId is required');
        }
        const data = await RoleCreation.getRolePermissions(roleId);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function assignRolePermissions(req, res) {
    try {
        const { roleId, permissions } = req.body;
        if (!roleId || !Array.isArray(permissions)) {
            return res.status(400).send('roleId and permissions array are required');
        }
        const data = await RoleCreation.assignRolePermissions(roleId, permissions);
        res.status(200).json({ message: "Permissions assigned to role successfully", data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}