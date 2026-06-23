import * as model from "../models/index.js";
import { Op } from "sequelize";
import { scoped } from "../utility/scoped.js";

export async function checksettingType() {
  const alreadyEntries = await scoped(model.settingModel).findAll({
    attributes: ["settingType"],
  });
  return alreadyEntries.map((entry) => entry.settingType);
}

export async function getSelectBoxData(settingstype) {
  const checkExistingSettingType = await checksettingType();

  try {
    if (checkExistingSettingType.includes(settingstype)) {
      return scoped(model.settingModel).findAll({
        where: {
          [Op.or]: [{ settingType: settingstype }, { settingType: "generic" }],
        },
      });
    }

    if (settingstype === "all") {
      return scoped(model.settingModel).findAll();
    }

    throw new Error(`Invalid Setting Type : ${settingstype}`);
  } catch (error) {
    console.error(`Error in repository select box data ${settingstype}:`, error);
    throw error;
  }
}

export async function getSettingValue(settingKey) {
  try {
    return scoped(model.settingModel).findOne({
      attributes: ["settingValue"],
      where: { settingKey },
    });
  } catch (error) {
    console.error(`Error in ${settingKey}:`, error);
    throw error;
  }
}
