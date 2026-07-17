import * as faculityLoadServices from "../services/faculityService.js";

export const addFaculityLoad = async (req, res) => {
  try {
    const data = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).send("userId is required");
    }
    const result = await faculityLoadServices.addFaculityLoad(data, createdBy, updatedBy);
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in adding faculity load:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const getFaculityLoadDetails = async (req, res) => {
  try {
    const result = await faculityLoadServices.getFaculityLoadDetails();
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in getting faculity load:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const getSingleFaculityLoadDetails = async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await faculityLoadServices.getSingleFaculityLoadDetails(userId);
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in getting faculity load:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const updateFaculityLoad = async (req, res) => {
  const { faculityLoadId, userId } = req.body;
  const updatedBy = req.user.userId;
  try {
    if (!(faculityLoadId && userId)) {
      return res.status(400).send("Both faculityLoadId and userId are required for each object.");
    }

    const result = await faculityLoadServices.updateFaculityLoad(faculityLoadId, req.body, updatedBy);
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in updating faculity load", error);
    res.status(500).send("Internal Server Error");
  }
};

export const deleteFaculityLoad = async (req, res) => {
  const { faculityLoadId } = req.query;
  try {
    if (!faculityLoadId) {
      res.status(400).send("faculity Load Id is required");
    } else {
      const result = await faculityLoadServices.deleteFaculityLoad(faculityLoadId);
      res.status(200).send(result);
    }
  } catch (error) {
    console.error(`Error in deleting faculity load Id ${faculityLoadId}:`, error);
    res.status(500).send("Internal Server Error");
  }
};
