import * as timeTableServices from "../services/timeTableServices.js";

export const addTimeTable = async (req, res) => {
  try {
    const data = req.body;

    const createdBy = req.user.userId;

    const updatedBy = req.user.userId;

    const result = await timeTableServices.addTimeTable(
      data,
      createdBy,
      updatedBy,
    );

    res.status(200).send(result);
  } catch (error) {
    console.error("Error in adding all time table:", error);

    res
      .status(
        error.message?.includes("not found") ||
          error.message?.includes("not mapped") ||
          error.message?.includes("No periods generated") ||
          error.message?.includes("required in request context")
          ? 400
          : 500,
      )

      .send(error.message || "Internal Server Error");
  }
};

export const getTimeTableDetails = async (req, res) => {
  const { courseId } = req.query;

  try {
    const result = await timeTableServices.getTimeTableDetails(courseId);
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in getting time table:", error);
    if (error.message?.includes("academic year scope") || error.message?.includes("institute scope")) {
      res.status(400).send("Active institute and academic year are required. Save via PUT /user/saveUserDefaults.");
      return;
    }
    res.status(500).send("Internal Server Error");
  }
};

export const getAllTimeTableName = async (req, res) => {
  const { courseId } = req.query;

  try {
    const result = await timeTableServices.getAllTimeTableName(courseId);
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in getting time table structure:", error);
    if (error.message?.includes("academic year scope") || error.message?.includes("institute scope")) {
      res.status(400).send("Active institute and academic year are required. Save via PUT /user/saveUserDefaults.");
      return;
    }
    res.status(500).send("Internal Server Error");
  }
};

export const getSingleTimeTableDetails = async (req, res) => {
  const { courseId } = req.query;

  try {
    const result = await timeTableServices.getSingleTimeTableDetails(courseId);
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in getting time table:", error);
    if (error.message?.includes("academic year scope") || error.message?.includes("institute scope")) {
      res.status(400).send("Active institute and academic year are required. Save via PUT /user/saveUserDefaults.");
      return;
    }
    res.status(500).send("Internal Server Error");
  }
};

export const updateTimeTable = async (req, res) => {
  try {
    const result = await timeTableServices.updateTimeTable(req.body);
    res.status(200).send(result);
  } catch (error) {
    console.error(`Error in updating time table`, error);

    if (error.message?.includes('not found')) {
      res.status(404).send(error.message);
    } else {
      res.status(500).send(error.message || 'Internal Server Error');
    }
  }
};

export const deleteTimeTable = async (req, res) => {
  const { timeTableCreationId } = req.query;

  try {
    const result = await timeTableServices.deleteTimeTable(timeTableCreationId);
    res.status(200).send(result);
  } catch (error) {
    console.error(
      `Error in deleting time table Id ${timeTableCreationId}:`,
      error,
    );

    if (error.message?.includes("routine and cannot be deleted")) {
      res.status(409).send(error.message);
    } else if (error.message?.includes("not found")) {
      res.status(404).send(error.message);
    } else {
      res.status(500).send("Internal Server Error");
    }
  }
};

export const deleteTimeTableStructure = async (req, res) => {
  const { timeTableNameId } = req.query;

  try {
    const result =
      await timeTableServices.deleteTimeTableStructure(timeTableNameId);

    res.status(200).send(result);
  } catch (error) {
    console.error(
      `Error in deleting time table structure Id ${timeTableNameId}:`,
      error,
    );

    if (error.message?.includes("routine and cannot be deleted")) {
      res.status(409).send(error.message);
    } else if (error.message?.includes("not found")) {
      res.status(404).send(error.message);
    } else {
      res.status(500).send("Internal Server Error");
    }
  }
};
