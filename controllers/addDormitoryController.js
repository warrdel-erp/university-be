import * as DormitoryRoomCreation from "../services/addDormitoryServices.js";

export async function addDormitoryRoom(req, res) {
  const { dormitory, roomNumber, type, numberOfBed, costPerBed } = req.body;
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;

  try {
    if (!(dormitory && roomNumber && type && numberOfBed && costPerBed)) {
      return res.status(400).send("dormitory, roomNumber, type, numberOfBed and costPerBed is required");
    }

    const DormitoryRoom = await DormitoryRoomCreation.addDormitoryRoom(req.body, createdBy, updatedBy);
    res.status(201).json({ message: "Data added successfully", DormitoryRoom });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAllDormitoryRoom(req, res) {
  try {
    const result = await DormitoryRoomCreation.getDormitoryRoomDetails();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getSingleDormitoryRoomDetails(req, res) {
  try {
    const { dormitoryListId } = req.query;
    const DormitoryRoom = await DormitoryRoomCreation.getSingleDormitoryRoomDetails(dormitoryListId);
    if (DormitoryRoom) {
      res.status(200).json(DormitoryRoom);
    } else {
      res.status(404).json({ message: "DormitoryRoom not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateDormitoryRoom(req, res) {
  try {
    const { dormitoryListId } = req.body;
    if (!dormitoryListId) {
      return res.status(400).send("dormitoryListId is required");
    }

    const updatedBy = req.user.userId;
    const updatedDormitoryRoom = await DormitoryRoomCreation.updateDormitoryRoom(
      dormitoryListId,
      req.body,
      updatedBy
    );
    res.status(200).json({ message: "DormitoryRoom update succesfully", updatedDormitoryRoom });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteDormitoryRoom(req, res) {
  try {
    const { dormitoryListId } = req.query;
    if (!dormitoryListId) {
      return res.status(400).json({ message: "dormitoryListId is required" });
    }

    const deleted = await DormitoryRoomCreation.deleteDormitoryRoom(dormitoryListId);
    if (deleted) {
      res.status(200).json({ message: `Delete successful for DormitoryRoom ID ${dormitoryListId}` });
    } else {
      res.status(404).json({ message: "DormitoryRoom not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
