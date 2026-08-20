import * as RoomTypeCreation from "../services/roomTypeServices.js";
import { SuccessResponse } from "../utility/response.js";

export async function addRoomType(req, res) {
    const { roomTypeName, academicYearId } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if (!(roomTypeName && academicYearId)) {
            return res.status(400).send('roomTypeName and academicYearId is required');
        }
        const RoomType = await RoomTypeCreation.addRoomType(req.body, createdBy, updatedBy);
        res.status(201).json({ message: "Data added successfully", RoomType });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllRoomType(req, res) {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const result = await RoomTypeCreation.getRoomTypeDetails(page, limit, search);
        return SuccessResponse(res, 200, "Room types fetched successfully", result.rows, {
            total: result.total,
            limit: parseInt(limit, 10),
            page: parseInt(page, 10),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleRoomTypeDetails(req, res) {
    try {
        const { roomTypeId } = req.query;
        const RoomType = await RoomTypeCreation.getSingleRoomTypeDetails(roomTypeId);
        if (RoomType) {
            res.status(200).json(RoomType);
        } else {
            res.status(404).json({ message: "RoomType not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateRoomType(req, res) {
    try {
        const { roomTypeId } = req.body;
        if (!roomTypeId) {
            return res.status(400).send('roomTypeId is required');
        }
        const updatedBy = req.user.userId;
        const updatedRoomType = await RoomTypeCreation.updateRoomType(roomTypeId, req.body, updatedBy);
        res.status(200).json({ message: "RoomType update succesfully", updatedRoomType });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteRoomType(req, res) {
    try {
        const { roomTypeId } = req.query;
        if (!roomTypeId) {
            return res.status(400).json({ message: "roomTypeId is required" });
        }
        const deleted = await RoomTypeCreation.deleteRoomType(roomTypeId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for RoomType ID ${roomTypeId}` });
        } else {
            res.status(404).json({ message: "RoomType not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
