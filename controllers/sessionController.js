import * as sessionCreation from "../services/sesssionServices.js";

export async function addSession(req, res) {
    const createdBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;

    try {
        const session = await sessionCreation.addSession(req.body, createdBy, updatedBy, universityId, instituteId);
        res.status(201).json({ message: "Data added successfully", session });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllSession(req, res) {
    const instituteId = req.user.instituteId;
    const role = req.user.role;
    const universityId = req.user.universityId;
    const acedmicYearId = req.query.acedmicYearId

    try {
        const session = await sessionCreation.getSessionDetails(universityId, instituteId, role, acedmicYearId);
        res.status(200).json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleSessionDetails(req, res) {
    // const universityId = req.user.universityId;
    try {
        const { sessionId } = req.query;
        const session = await sessionCreation.getSingleSessionDetails(sessionId);
        if (session) {
            res.status(200).json(session);
        } else {
            res.status(404).json({ message: "session not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateSession(req, res) {
    try {
        const { sessionId } = req.body
        if (!(sessionId)) {
            return res.status(400).send('SessionId is required')
        }
        const updatedBy = req.user.userId;
        const updatedSession = await sessionCreation.updateSession(sessionId, req.body, updatedBy);
        res.status(200).json({ message: "session update succesfully", updatedSession });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteSession(req, res) {
    try {
        const { sessionId } = req.query;
        if (!sessionId) {
            return res.status(400).json({ message: "SessionId is required" });
        }
        const deleted = await sessionCreation.deleteSession(sessionId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for session ID ${sessionId}` });
        } else {
            res.status(404).json({ message: "session not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function couseSessionMapping(req, res) {
    const { sessionId } = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if (!(sessionId)) {
            return res.status(400).send('sessionId is required')
        }
        const session = await sessionCreation.couseSessionMapping(req.body, createdBy, updatedBy, universityId, instituteId);
        res.status(201).json({ message: "Data added successfully", session });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function updateCouseSessionMapping(req, res) {
    const { sessionCourseMappingId } = req.body
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if (!(sessionCourseMappingId)) {
            return res.status(400).send('sessionCourseMappingId is required')
        }
        const session = await sessionCreation.updateCouseSessionMapping(req.body, updatedBy, universityId, instituteId);
        res.status(201).json({ message: "Data added successfully", session });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};