import * as holidayCreation from '../services/holidayServices.js';

export async function addHoliday(req, res) {
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        const holiday = await holidayCreation.addHoliday(req.body, createdBy, updatedBy);
        res.status(201).json({ message: 'Data added successfully', holiday });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllHoliday(req, res) {
    try {
        const { name, event, date } = req.query;
        const filter = { ...(name && { name }), ...(event && { event }), ...(date && { date }) };
        const holidays = await holidayCreation.getAllHolidays(filter);
        res.status(200).json(holidays);
    } catch (error) {
        const statusCode = /scope/i.test(error.message) ? 400 : 500;
        res.status(statusCode).json({ error: error.message });
    }
}

export async function getSingleHolidayDetails(req, res) {
    try {
        const { holidayId } = req.query;
        const holiday = await holidayCreation.getSingleHolidayDetails(holidayId);
        if (holiday) {
            res.status(200).json(holiday);
        } else {
            res.status(404).json({ message: 'Holiday not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateHoliday(req, res) {
    try {
        const { holidayId, ...updateData } = req.body;
        const updatedBy = req.user.userId;
        const updatedHolidays = await holidayCreation.updateHoliday(holidayId, updateData, updatedBy);
        res.status(200).json({ message: 'Holiday update succesfully', updatedHolidays });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteHoliday(req, res) {
    try {
        const { holidayId } = req.query;
        const deleted = await holidayCreation.deleteHoliday(holidayId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for Holiday ID ${holidayId}` });
        } else {
            res.status(404).json({ message: 'Holiday not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
