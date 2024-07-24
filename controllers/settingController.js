import * as settingsService from "../services/settingServices.js";

export const getAllSelectBoxData = async (req, res) => {
  try {
    let { settingstype } = req.query;
    settingstype = settingstype || "all";

    const result = await settingsService.getAllSelectBoxData(settingstype);
    console.log("result", result.length);

    if (result.length > 0) {
      return res.status(200).json({
        message: "Data fetch successfully",
        status: true,
        data: result,
      });
    } else {
      return res.status(401).json({
        message:`No Data Found for ${settingstype}`,
        status: false,
      });
    }
  } catch (error) {
    console.error("Error in getting select Box :", error);
    return res.status(500).send("Internal Server Error");
  }
};