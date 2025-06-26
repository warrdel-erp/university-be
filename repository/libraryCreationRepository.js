import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addLibrary(libraryData,transaction) {    
    try {
        const result = await model.libraryCreationModel.create(libraryData,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add library :", error);
        throw error;
    }
};

export async function addLibraryAuthority(libraryData,transaction) {    
    try {
        const result = await model.libraryAuthorityModel.create(libraryData,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add library Authority:", error);
        throw error;
    }
};

export async function getLibraryDetails(universityId) {
    try {
        const libraries = await model.libraryCreationModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","instituteId","createdBy","updatedBy"] },
            include: [
                {
                    model: model.userModel,
                    as: "userLibraryCreation",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model: model.libraryAuthorityModel,
                    as: "libraryCreationAuthority",
                    attributes: ["userName","canWaiveOffFine","defaultLibrary","libraryAuthorityId","libraryCreationId"] ,
                    include:[
                        {
                            model: model.employeeModel,
                            as: "libraryEmployee",
                            attributes: ["employeeName","shortName"] ,
                        },
                    ]
                },
                {
                    model: model.instituteModel,
                    as: "libraryCreationInstitute",
                    attributes: ["instituteName"] ,
                    include:[
                        {
                            model:model.campusModel,
                            as:"campues",
                            attributes: ["campusName"],
                        }
                    ]
                }
            ]
        });

        return libraries;
    } catch (error) {
        console.error('Error fetching library details:', error);
        throw error;
    }
}


export async function getSingleLibraryDetails(libraryCreationId) {
    try {
        const library = await model.libraryCreationModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "instituteId", "createdBy", "updatedBy"] },
            where: { libraryCreationId },
            include: [
                {
                    model: model.userModel,
                    as: "userLibraryCreation",
                    attributes: ["universityId", "userId"]
                },
                {
                    model: model.libraryAuthorityModel,
                    as: "libraryCreationAuthority",
                    attributes: ["userName", "canWaiveOffFine", "defaultLibrary","libraryAuthorityId","libraryCreationId"],
                    include: [
                        {
                            model: model.employeeModel,
                            as: "libraryEmployee",
                            attributes: ["employeeName", "shortName","employeeId"]
                        }
                    ]
                },
                {
                    model: model.instituteModel,
                    as: "libraryCreationInstitute",
                    attributes: ["instituteName"],
                    include: [
                        {
                            model: model.campusModel,
                            as: "campues",
                            attributes: ["campusName"]
                        }
                    ]
                }
            ]
        });

        return library;
    } catch (error) {
        console.error('Error fetching library details:', error);
        throw error;
    }
}

export async function deleteLibray(libraryCreationId) {
    const deleted = await model.libraryCreationModel.destroy({ where: { libraryCreationId: libraryCreationId } });
    return deleted > 0;
}

export async function updateLibrary(libraryCreationId, libraryData, transaction) {
    try {
        const result = await model.libraryCreationModel.update(libraryData, {
            where: { libraryCreationId },
            transaction
        });
        return result; 
    } catch (error) {
        console.error(`Error updating library creation ${libraryCreationId}:`, error);
        throw error; 
    }
}

export async function updateLibraryAuthority(libraryAuthorityId, libraryData, transaction) {
    try {
        const result = await model.libraryAuthorityModel.update(libraryData, {
            where: {
                libraryAuthorityId: libraryAuthorityId 
            },
            transaction
        });
        return result;
    } catch (error) {
        console.error(`Error updating library authority ${libraryAuthorityId}:`, error);
        throw error;
    }
}