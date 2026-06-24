import * as acedmicYearCreation from '../services/acedmicYearServices.js';

export async function addacedmicYear(req, res) {
    const updatedBy = req.user.userId;
    try {
        const acedmicYear = await acedmicYearCreation.addacedmicYear(req.body, updatedBy);
        res.status(201).json({ message: 'Academic year activated successfully', acedmicYear });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllacedmicYear(req, res) {
    try {
        const acedmicYear = await acedmicYearCreation.getacedmicYearDetails();
        res.status(200).json(acedmicYear);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateacedmicYear(req, res) {
    try {
        const { acedmicYearId, ...updateData } = req.body;
        const updatedBy = req.user.userId;
        const updated = await acedmicYearCreation.updateacedmicYear(acedmicYearId, updateData, updatedBy);
        if (!updated) {
            return res.status(404).json({ message: 'acedmicYear not found' });
        }
        res.status(200).json({ message: 'acedmicYear update succesfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteacedmicYear(req, res) {
    try {
        const { acedmicYearId } = req.query;
        const deleted = await acedmicYearCreation.deleteacedmicYear(acedmicYearId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for acedmicYear ID ${acedmicYearId}` });
        } else {
            res.status(404).json({ message: 'acedmicYear not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getActiveAcedmicYearByInstitute(req, res) {
    try {
        const acedmicYears = await acedmicYearCreation.getActiveAcedmicYearByInstitute();
        res.status(200).json(acedmicYears);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function newActivateAndCopyData(req, res) {
    try {
        const updatedBy = req.user.userId;
        const acedmicYear = await acedmicYearCreation.newActivateAndCopyData(req.body, updatedBy);
        res.status(201).json({ message: 'Academic year activated and data copied successfully', acedmicYear });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
