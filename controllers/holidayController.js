import * as holidayCreation  from  "../services/holidayServices.js";

export async function addHoliday(req, res) {
    const {name} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(name)){
           return res.status(400).send('HolidayName is required')
        }
        const holiday = await holidayCreation.addHoliday(req.body,createdBy,updatedBy);
        res.status(201).json({ message: "Data added successfully", holiday });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllHoliday(req, res) {
    const universityId = req.user.universityId;
    try {
        const holiday = await holidayCreation.getHolidayDetails(universityId);
        res.status(200).json(holiday);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleHolidayDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { holidayId } = req.query;
        const holiday = await holidayCreation.getSingleHolidayDetails(holidayId,universityId);
        if (holiday) {
            res.status(200).json(holiday);
        } else {
            res.status(404).json({ message: "Holiday not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateHoliday(req, res) {
    try {
        const {holidayId} = req.body
        if(!(holidayId)){
            return res.status(400).send('holidayId is required')
         }
         const updatedBy = req.user.userId;
        const updatedHolidays = await holidayCreation.updateHoliday(holidayId, req.body,updatedBy);
            res.status(200).json({message: "Holiday update succesfully",updatedHolidays });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteHoliday(req, res) {
    try {
        const { holidayId } = req.query;
        if (!holidayId) {
            return res.status(400).json({ message: "holidayId is required" });
        }
        const deleted = await holidayCreation.deleteHoliday(holidayId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for Holiday ID ${holidayId}` });
        } else {
            res.status(404).json({ message: "Holiday not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}