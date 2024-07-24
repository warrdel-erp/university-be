import * as settingsRepository from '../repository/settingRepository.js'

export async function getAllSelectBoxData(settingstype){
    const settings = await settingsRepository.getSelectBoxData(settingstype);
    return settings.map(s => {
        return {
            ...s.dataValues,
            settingValue: typeof s.dataValues.settingValue === 'object' ? s.dataValues.settingValue : JSON.parse(s.dataValues.settingValue)     
        }
    });
}