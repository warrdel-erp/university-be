import * as SubAccountCreation from '../services/subAccountServices.js';

export async function addSubAccount(req, res) {
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        const SubAccountDetails = await SubAccountCreation.addSubAccount(req.body, createdBy, updatedBy);
        res.status(201).json({ message: 'Data added successfully', SubAccountDetails });
    } catch (error) {
        const status = /not found|pass accountId/i.test(error.message) ? 400 : 500;
        res.status(status).json({ error: error.message });
    }
}

export async function getAllSubAccount(req, res) {
    try {
        const SubAccountDetails = await SubAccountCreation.getSubAccountDetails();
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
        const { subAccountId, ...updateData } = req.body;
        const updatedBy = req.user.userId;
        const updated = await SubAccountCreation.updateSubAccount(subAccountId, updateData, updatedBy);
        if (!updated) {
            return res.status(404).json({ message: 'SubAccountDetails not found' });
        }
        res.status(200).json({ message: 'SubAccountDetails update succesfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteSubAccount(req, res) {
    try {
        const { subAccountId } = req.query;
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
        const accounts = await SubAccountCreation.getAllAccount();
        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
