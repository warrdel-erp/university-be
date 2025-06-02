import transportVehicleService from '../services/vehicleServices.js';

export const addVehicle = async (req, res) => {
    const instituteId = req.user.instituteId;
    try {
        const { vehicleNumber, vehicleModel, madeYear, employeeId } = req.body;
        if (!vehicleNumber || !vehicleModel || !madeYear || !employeeId) {
            return res.status(400).json({ message: "vehicleNumber, vehicleModel, madeYear, employeeId are required" });
        }
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const vehicleData = { ...req.body, createdBy, updatedBy ,instituteId};
        const vehicle = await transportVehicleService.createVehicle(vehicleData);
        res.status(201).json({ success: true, data: vehicle });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getVehicle = async (req, res) => {
    const universityId = req.user.universityId;
    const role = req.user.role;    
    const instituteId = req.user.instituteId;
    const {acedmicYearId} =req.query
    try {
        const vehicles = await transportVehicleService.getAllVehicles(universityId,acedmicYearId,role,instituteId);
        res.status(200).json(vehicles);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSingleVehicle = async (req, res) => {
    const universityId = req.user.universityId;
    try {
        const { vehicleId } = req.query;
        const vehicle = await transportVehicleService.getVehicleById(vehicleId, universityId);
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
