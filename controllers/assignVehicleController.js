import {
    addAssignVehicle as addAssignVehicleService,
    getAssignVehicle as getAssignVehicleService,
    getSingleAssignVehicle as getSingleAssignVehicleService,
    updateAssignVehicle as updateAssignVehicleService,
    deleteAssignVehicle as deleteAssignVehicleService
} from '../services/assignVehicleServices.js';
 
export const addAssignVehicle = async (req, res) => {
    try {
        const { transportRouteId, vehicleId } = req.body;
 
        if (!transportRouteId || !vehicleId) {
            return res.status(400).json({ message: "transportRouteId and vehicleId are required" });
        }
 
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;

        const assignVehicleData = { ...req.body, createdBy, updatedBy };
 
        const vehicle = await addAssignVehicleService(assignVehicleData);

       
        res.status(201).json({ success: true, data: vehicle });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
 
export const getAssignVehicle = async (req, res) => {
    try {
        const universityId = req.user.universityId;
        const { acedmicYearId } = req.query;
        const vehicles = await getAssignVehicleService(universityId,acedmicYearId);
        res.status(200).json(vehicles);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

 
export const getSingleAssignVehicle = async (req, res) => {
    try {
        const universityId = req.user.universityId;
        const { assignVehicleId } = req.query;
        const vehicle = await getSingleAssignVehicleService(assignVehicleId, universityId);
        res.status(200).json(vehicle);
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};
 
export const updateAssignVehicle = async (req, res) => {
    try {
        const { assignVehicleId } = req.body;
        const userId = req.user.userId;
        const updatedRows = await updateAssignVehicleService(assignVehicleId, req.body, userId);
        res.status(200).json(updatedRows);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

 
export const deleteAssignVehicle = async (req, res) => {
    try {
        const { assignVehicleId } = req.query;
        const deletedRows = await deleteAssignVehicleService(assignVehicleId);
        res.status(200).json({ success: true, data: { deletedRows } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
