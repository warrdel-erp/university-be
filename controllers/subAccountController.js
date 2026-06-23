import * as SubAccountCreation from '../services/subAccountServices.js';

export async function addSubAccount(req, res) {
    const { accountId } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    try {
        if (!accountId) {
            return res.status(400).send('accountId is required');
        }
        const body = { ...req.body, universityId };
        const SubAccountDetails = await SubAccountCreation.addSubAccount(body, createdBy, updatedBy);
        res.status(201).json({ message: 'Data added successfully', SubAccountDetails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllSubAccount(req, res) {
    const universityId = req.user.universityId;
    try {
        const SubAccountDetails = await SubAccountCreation.getSubAccountDetails(universityId);
        res.status(200).json(SubAccountDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleSubAccountDetails(req, res) {
    try {
        const { subAccountId } = req.query;
        const SubAccountDetails = await SubAccountCreation.getSingleSubAccountDetails(subAccountId);
        if (SubAccountDetails) {
            res.status(200).json(SubAccountDetails);
        } else {
            res.status(404).json({ message: 'SubAccountDetails not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateSubAccount(req, res) {
    try {
        const { subAccountId } = req.body;
        if (!subAccountId) {
            return res.status(400).send('SubAccountId is required');
        }
        const updatedBy = req.user.userId;
        await SubAccountCreation.updateSubAccount(subAccountId, req.body, updatedBy);
        res.status(200).json({ message: 'SubAccountDetails update succesfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteSubAccount(req, res) {
    try {
        const { subAccountId } = req.query;
        if (!subAccountId) {
            return res.status(400).json({ message: 'SubAccountId is required' });
        }
        const deleted = await SubAccountCreation.deleteSubAccount(subAccountId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for SubAccountDetails ID ${subAccountId}` });
        } else {
            res.status(404).json({ message: 'SubAccountDetails not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllAccount(req, res) {
    try {
        const SubAccountDetails = await SubAccountCreation.getAllAccount();
        res.status(200).json(SubAccountDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
