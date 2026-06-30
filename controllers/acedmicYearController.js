import * as acedmicYearCreation from '../services/acedmicYearServices.js';

export async function addacedmicYear(req, res) {
    const updatedBy = req.user.userId;
    try {
        const acedmicYear = await acedmicYearCreation.addacedmicYear(req.body, updatedBy);
        res.status(201).json({ message: 'Academic year activated successfully', acedmicYear });
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
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
        const { academicYearId, ...updateData } = req.body;
        const updated = await acedmicYearCreation.updateacedmicYear(academicYearId, updateData, req.user.userId);
        if (!updated) {
            return res.status(404).json({ message: 'acedmicYear not found' });
        }
        res.status(200).json({ message: 'acedmicYear update succesfully' });
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
}

export async function deleteacedmicYear(req, res) {
    try {
        const { academicYearId } = req.query;
        const deleted = await acedmicYearCreation.deleteacedmicYear(academicYearId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for acedmicYear ID ${academicYearId}` });
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

export async function getActiveAcedmicYearListByInstituteId(req, res) {
    try {
        const instituteId = Number(req.params.instituteId);
        const acedmicYears = await acedmicYearCreation.getActiveAcedmicYearListByInstituteId(instituteId);
        res.status(200).json(acedmicYears);
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
}

export async function newActivateAndCopyData(req, res) {
    try {
        const acedmicYear = await acedmicYearCreation.newActivateAndCopyData(req.body, req.user.userId);
        const copied = req.body.copyData?.length;
        res.status(201).json({
            message: copied
                ? 'Academic year activated and data copied successfully'
                : 'Academic year activated successfully',
            acedmicYear,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
}
