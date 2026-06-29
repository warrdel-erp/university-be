import * as headCreation from "../services/headServices.js";

export async function addHead(req, res) {
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  try {
    const headDetails = await headCreation.addHead(req.body, createdBy, updatedBy);
    res.status(201).json({ message: "Data added successfully", headDetails });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAllHead(req, res) {
  try {
    const headDetails = await headCreation.getHeadDetails();
    res.status(200).json(headDetails);
  } catch (error) {
    if (
      error.message?.includes("Active institute") ||
      error.message?.includes("institute scope") ||
      error.message?.includes("university scope")
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function getSingleHeadDetails(req, res) {
  try {
    const { headId } = req.query;
    const headDetails = await headCreation.getSingleHeadDetails(headId);
    if (headDetails) {
      res.status(200).json(headDetails);
    } else {
      res.status(404).json({ message: "headDetails not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateHead(req, res) {
  try {
    const { headId, ...updateData } = req.body;
    const updatedBy = req.user.userId;
    await headCreation.updateHead(headId, updateData, updatedBy);
    res.status(200).json({ message: "headDetails update succesfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteHead(req, res) {
  try {
    const { headId } = req.query;
    const deleted = await headCreation.deleteHead(headId);
    if (deleted) {
      res.status(200).json({ message: `Delete successful for headDetails ID ${headId}` });
    } else {
      res.status(404).json({ message: "headDetails not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
