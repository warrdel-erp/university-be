import {
  addTransportRouteService,
  getAllTransportRouteService,
  getSingleTransportRouteService,
  updateTransportRouteService,
  deleteTransportRouteService,
} from "../services/transportRouteService.js";
import { SuccessResponse } from "../utility/response.js";

export const addTransportRoute = async (req, res) => {
  try {
    const { routeTitle, fare, academicYearId } = req.body;
    if (!routeTitle || !fare || !academicYearId) {
      return res.status(400).json({ message: "routeTitle, fare, academicYearId are required" });
    }
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const data = { ...req.body, createdBy, updatedBy };
    const result = await addTransportRouteService(data);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Error in addTransportRoute:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllTransportRoute = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const result = await getAllTransportRouteService(page, limit, search);
    return SuccessResponse(res, 200, "Transport routes fetched successfully", result.rows, {
      total: result.total,
      limit: parseInt(limit, 10),
      page: parseInt(page, 10),
    });
  } catch (error) {
    console.error("Error in getAllTransportRoute:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getSingleTransportRoute = async (req, res) => {
  try {
    const { transportRouteId } = req.query;
    const result = await getSingleTransportRouteService(transportRouteId);
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
