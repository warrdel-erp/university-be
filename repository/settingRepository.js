import * as model from "../models/index.js";
import { Op } from "sequelize";

export async function getSelectBoxData(settingstype) {
    const checkExistingSettingType = await checksettingType();
    let result;
    try {
        if (checkExistingSettingType.includes(settingstype)) {
            result = await model.settingModel.findAll({
                where: {
                    [Op.or]: [
                        { setting_type: settingstype },
                        { setting_type: "generic" },
                    ],
                },
            });
        } else if (settingstype === "all") {
            result = await model.settingModel.findAll();
        }else{
            throw new Error(`Invalid Setting Type : ${settingstype}`);
        }

        return result;
    } catch (error) {
        console.error(`Error in repository select box data${settingstype}:`, error);
        throw error;
    }
}

export async function checksettingType() {
    const alreadyEntries = await model.settingModel.findAll({
        attributes: ["setting_type"],
    });
    const settingTypes = alreadyEntries.map(
        (entry) => entry.dataValues.setting_type
    );
    return settingTypes;
}

export async function getSettingValue(settingKey) {
    try {
        const result = await model.settingModel.findOne({
            attributes: ["setting_value"],
            where: {
                setting_key: settingKey
            },
        });
        return result;
    } catch (error) {
        console.error(`Error in ${settingKey}:`, error);
        throw error;
    };
};