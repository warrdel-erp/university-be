import * as RoomTypeCreation  from  "../services/roomTypeServices.js";

export async function addRoomType(req, res) {
    const {roomTypeName,acedmicYearId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if(!(roomTypeName && acedmicYearId)){
           return res.status(400).send('roomTypeName and acedmicYearId is required')
        }
        const RoomType = await RoomTypeCreation.addRoomType(req.body,createdBy,updatedBy,universityId,instituteId);
        res.status(201).json({ message: "Data added successfully", RoomType });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllRoomType(req, res) {
    const universityId = req.user.universityId;
    const { acedmicYearId } = req.query;
    const role = req.user.role;    
    const instituteId = req.user.instituteId;
    try {
        const roomType = await RoomTypeCreation.getRoomTypeDetails(universityId,acedmicYearId,role,instituteId);
        res.status(200).json(roomType);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleRoomTypeDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { roomTypeId } = req.query;
        const RoomType = await RoomTypeCreation.getSingleRoomTypeDetails(roomTypeId,universityId);
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
        const {roomTypeId} = req.body
        if(!(roomTypeId)){
            return res.status(400).send('roomTypeId is required')
         }
         const updatedBy = req.user.userId;
        const updatedRoomType = await RoomTypeCreation.updateRoomType(roomTypeId, req.body,updatedBy);
            res.status(200).json({message: "RoomType update succesfully",updateRoomType });
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