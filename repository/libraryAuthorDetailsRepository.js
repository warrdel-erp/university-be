import * as model from '../models/index.js'

export async function libraryAuthorDetails(data,transaction) {    
    try {
        const result = await model.libraryAuthorDetailsModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add library author :", error);
        throw error;
    }
};