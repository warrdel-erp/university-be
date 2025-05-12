import {
    addTransportRouteService,
    getAllTransportRouteService,
    getSingleTransportRouteService,
    updateTransportRouteService,
    deleteTransportRouteService
} from "../services/transportRouteService.js";

export const addTransportRoute = async (req, res) => {
    try {
        const { routeTitle, fare ,acedmicYearId} = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        if (!routeTitle || !fare) {
            return res.status(400).json({ message: "routeTitle and fare are required" });
        };

        if (!acedmicYearId) {
            return res.status(400).json({ message: "acedmicYearId is required" });
        }

        const transportRouteData = { ...req.body, createdBy, updatedBy };
        const result = await addTransportRouteService(transportRouteData);

        res.status(201).json({ message: "Transport route added successfully", result });
    } catch (error) {
        console.error("Error in addTransportRoute:", error);
        res.status(500).json({ error: error.message });
    }
};

export const getAllTransportRoute = async (req, res) => {
    const universityId = req.user.universityId;
    const { acedmicYearId } = req.query;
    try {
        const result = await getAllTransportRouteService(universityId,acedmicYearId);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error in getAllTransportRoute:", error);
        res.status(500).json({ error: error.message });
    }
};

export const getSingleTransportRoute = async (req, res) => {
    const universityId = req.user.universityId;
    try {
        const { transportRouteId } = req.query;
        const result = await getSingleTransportRouteService(transportRouteId, universityId);
        if (result) {
            res.status(200).json(result);
        } else {
            res.status(404).json({ message: "Transport route not found" });
        }
    } catch (error) {
        console.error("Error in getSingleTransportRoute:", error);
        res.status(500).json({ error: error.message });
    }
};

export const updateTransportRoute = async (req, res) => {
    try {
        const { transportRouteId } = req.body;
        const updatedBy = req.user.userId;

        if (!transportRouteId) {
            return res.status(400).json({ message: "transportRouteId is required" });
        }

        const transportRouteData = { ...req.body, updatedBy };
        const result = await updateTransportRouteService(transportRouteId, transportRouteData);

        if (result[0]) {
            res.status(200).json({ message: "Transport route updated successfully" });
        } else {
            res.status(404).json({ message: "Transport route not found" });
        }
    } catch (error) {
        console.error("Error in updateTransportRoute:", error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteTransportRoute = async (req, res) => {
    try {
        const { transportRouteId } = req.query;
        const result = await deleteTransportRouteService(transportRouteId);
        if (result) {
            res.status(200).json({ message: "Transport route deleted successfully" });
        } else {
            res.status(404).json({ message: "Transport route not found" });
        }
    } catch (error) {
        console.error("Error in deleteTransportRoute:", error);
        res.status(500).json({ error: error.message });
    }
};
