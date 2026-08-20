import * as transportVehicleService from "../services/vehicleServices.js";
import { SuccessResponse } from "../utility/response.js";

export const addVehicle = async (req, res) => {
  try {
    const { vehicleNumber, vehicleModel, madeYear, userId } = req.body;
    if (!vehicleNumber || !vehicleModel || !madeYear || !userId) {
      return res.status(400).json({ message: "vehicleNumber, vehicleModel, madeYear, userId are required" });
    }
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const vehicleData = { ...req.body, createdBy, updatedBy };
    const vehicle = await transportVehicleService.createVehicle(vehicleData);
    res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVehicle = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const result = await transportVehicleService.getAllVehicles(page, limit, search);
    return SuccessResponse(res, 200, "Vehicles fetched successfully", result.rows, {
      total: result.total,
      limit: parseInt(limit, 10),
      page: parseInt(page, 10),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSingleVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.query;
    const vehicle = await transportVehicleService.getVehicleById(vehicleId);
    res.status(200).json(vehicle);
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.body;
    const vehicleData = req.body;
    const userId = req.user.userId;
    const updatedRows = await transportVehicleService.updateVehicle(vehicleId, vehicleData, userId);
    res.status(200).json(updatedRows);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.query;
    const deletedRows = await transportVehicleService.deleteVehicle(vehicleId);
    res.status(200).json({ success: true, data: { deletedRows } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
