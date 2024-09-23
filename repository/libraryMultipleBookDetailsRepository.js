import * as model from '../models/index.js'

export async function libraryMultipleBookDetails(data,transaction) {    
    try {
        const result = await model.libraryMultipleBookDetailsModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add library multiple details :", error);
        throw error;
    }
};