import * as model from "../models/index.js";

export const validateEmployeeUser = async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return { valid: false, status: 404, message: "User ID not found" };
  }
  const employeeRecord = await model.employeeModel.findOne({
    where: { userId },
  });
  return { valid: true, userId, employeeRecord: employeeRecord || null };
};
