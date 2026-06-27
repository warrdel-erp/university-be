import * as governanceBodyService from '../services/governanceBodyService.js';

export async function createGovernanceBody(req, res) {
    try {
        const createdBy = req.user.userId;
        const body = await governanceBodyService.createGovernanceBody(req.body, createdBy, createdBy);
        res.status(201).json({ message: 'Governance body created successfully', data: body });
    } catch (error) {
        const statusCode = /required|not found|cannot|before|parent/i.test(error.message) ? 400 : 500;
        res.status(statusCode).json({ error: error.message });
    }
}

export async function getAllGovernanceBodies(req, res) {
    try {
        const bodies = await governanceBodyService.getAllGovernanceBodies();
        res.status(200).json(bodies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getGovernanceBodyById(req, res) {
    try {
        const { governanceBodyId } = req.query;
        const body = await governanceBodyService.getGovernanceBodyById(governanceBodyId);
        if (body) {
            res.status(200).json(body);
        } else {
            res.status(404).json({ message: 'Governance body not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateGovernanceBody(req, res) {
    try {
        const { governanceBodyId } = req.body;
        const updatedBy = req.user.userId;
        const body = await governanceBodyService.updateGovernanceBody(governanceBodyId, req.body, updatedBy);
        if (body) {
            res.status(200).json({ message: 'Governance body updated successfully', data: body });
        } else {
            res.status(404).json({ message: 'Governance body not found' });
        }
    } catch (error) {
        const statusCode = /required|not found|cannot|before|parent/i.test(error.message) ? 400 : 500;
        res.status(statusCode).json({ error: error.message });
    }
}

export async function deleteGovernanceBody(req, res) {
    try {
        const { governanceBodyId } = req.query;
        const result = await governanceBodyService.deleteGovernanceBody(governanceBodyId);
        if (result) {
            res.status(200).json({ message: `Delete successful for governance body ID ${governanceBodyId}` });
        } else {
            res.status(404).json({ message: 'Governance body not found' });
        }
    } catch (error) {
        const statusCode = /cannot delete|child bodies/i.test(error.message) ? 400 : 500;
        res.status(statusCode).json({ error: error.message });
    }
}
