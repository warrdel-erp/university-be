import * as orgServices from '../services/orgServices.js';

export async function addOrgPosition(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const orgPosition = await orgServices.addOrgPosition(
            req.body,
            createdBy,
            updatedBy,
        );
        res.status(201).json({ message: 'Data added successfully', orgPosition });
    } catch (error) {
        const status = /not found|Invalid/i.test(error.message) ? 400 : 500;
        res.status(status).json({ error: error.message });
    }
}

export async function getAllOrgPositions(req, res) {
    try {
        const { departmentStructureId, subAccountId, employmentCategory, isVacant } = req.query;
        const positions = await orgServices.getOrgPositions({
            departmentStructureId,
            subAccountId,
            employmentCategory,
            isVacant,
        });
        res.status(200).json(positions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleOrgPosition(req, res) {
    try {
        const { orgPositionId } = req.query;
        const orgPosition = await orgServices.getOrgPositionById(
            orgPositionId,
        );
        if (!orgPosition) {
            return res.status(404).json({ message: 'orgPosition not found' });
        }
        res.status(200).json(orgPosition);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateOrgPosition(req, res) {
    try {
        const { orgPositionId } = req.body;
        const updatedBy = req.user.userId;
        const updated = await orgServices.updateOrgPosition(
            orgPositionId,
            req.body,
            updatedBy,
        );
        if (!updated) {
            return res.status(404).json({ message: 'orgPosition not found' });
        }
        res.status(200).json({ message: 'orgPosition update succesfully' });
    } catch (error) {
        const status = /not found|Invalid/i.test(error.message) ? 400 : 500;
        res.status(status).json({ error: error.message });
    }
}

export async function deleteOrgPosition(req, res) {
    try {
        const { orgPositionId } = req.query;
        const deleted = await orgServices.deleteOrgPosition(orgPositionId);
        if (!deleted) {
            return res.status(404).json({ message: 'orgPosition not found' });
        }
        res.status(200).json({
            message: `Delete successful for orgPosition ID ${orgPositionId}`,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function markPositionVacant(req, res) {
    try {
        const { orgPositionId } = req.body;
        const updatedBy = req.user.userId;
        const orgPosition = await orgServices.markPositionVacant(
            orgPositionId,
            updatedBy,
        );
        res.status(200).json({ message: 'Position marked vacant', orgPosition });
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : 500;
        res.status(status).json({ error: error.message });
    }
}

export async function addHead(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const head = await orgServices.addHead(
            req.body,
            createdBy,
            updatedBy,
        );
        res.status(201).json({ message: 'Data added successfully', head });
    } catch (error) {
        const status = /not found|Invalid|already has/i.test(error.message) ? 400 : 500;
        res.status(status).json({ error: error.message });
    }
}

export async function getHeads(req, res) {
    try {
        const { orgPositionId } = req.query;
        const heads = await orgServices.getHeadsByPositionId(
            orgPositionId,
        );
        res.status(200).json(heads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateHead(req, res) {
    try {
        const { orgPositionHeadId } = req.body;
        const updatedBy = req.user.userId;
        const head = await orgServices.updateHead(
            orgPositionHeadId,
            req.body,
            updatedBy,
        );
        if (!head) {
            return res.status(404).json({ message: 'head not found' });
        }
        res.status(200).json({ message: 'head update succesfully', head });
    } catch (error) {
        const status = /Invalid/i.test(error.message) ? 400 : 500;
        res.status(status).json({ error: error.message });
    }
}

export async function deleteHead(req, res) {
    try {
        const { orgPositionHeadId } = req.query;
        const updatedBy = req.user.userId;
        const deleted = await orgServices.deleteHead(
            orgPositionHeadId,
            updatedBy,
        );
        if (!deleted) {
            return res.status(404).json({ message: 'head not found' });
        }
        res.status(200).json({
            message: `Delete successful for head ID ${orgPositionHeadId}`,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
