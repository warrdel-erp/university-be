import * as ClassRoomCreation  from  "../services/classRoomServices.js";

export async function addClassRoom(req, res) {
    const {roomNumber,capacity} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(roomNumber && capacity)){
           return res.status(400).send('room Number and capacity is required')
        }
        const classRoom = await ClassRoomCreation.addClassRoom(req.body,createdBy,updatedBy);
        res.status(201).json({ message: "Data added successfully", classRoom });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllClassRoom(req, res) {
    const universityId = req.user.universityId;
    try {
        const libraries = await ClassRoomCreation.getClassRoomDetails(universityId);
        res.status(200).json(libraries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleClassRoomDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { classRoomSectionId } = req.query;
        const ClassRoom = await ClassRoomCreation.getSingleClassRoomDetails(classRoomSectionId,universityId);
        if (ClassRoom) {
            res.status(200).json(ClassRoom);
        } else {
            res.status(404).json({ message: "ClassRoom not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateClassRoom(req, res) {
    try {
        const {classRoomSectionId} = req.body
        if(!(classRoomSectionId)){
            return res.status(400).send('classRoomSectionId is required')
         }
         const updatedBy = req.user.userId;
        const updatedClassRoom = await ClassRoomCreation.updateClassRoom(classRoomSectionId, req.body,updatedBy);
            res.status(200).json({message: "ClassRoom update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteClassRoom(req, res) {
    try {
        const { classRoomSectionId } = req.query;
        if (!classRoomSectionId) {
            return res.status(400).json({ message: "classRoomSectionId is required" });
        }
        const deleted = await ClassRoomCreation.deleteClassRoom(classRoomSectionId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for ClassRoom ID ${classRoomSectionId}` });
        } else {
            res.status(404).json({ message: "ClassRoom not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}