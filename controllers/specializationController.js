import * as specializationService from "../services/specializationService.js";

export const updateSpecialization = async (req, res) => {
  try {
    const { specializationId, ...body } = req.body;
    const result = await specializationService.updateSpecialization(specializationId, body);

    return res.status(200).json({
      status: "success",
      message: "Specialization updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in Update Specialization Controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      status: "error",
      message: statusCode === 500 ? "Internal Server Error" : error.message,
      ...(statusCode === 500 && { error: error.message }),
    });
  }
};
