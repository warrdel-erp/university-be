import * as libraryCreationService  from "../repository/libraryCreationRepository.js";
import sequelize from '../database/sequelizeConfig.js'; 

export async function addLibrary(libraryData, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();

    try {
        // Add library data
        libraryData.createdBy = createdBy;
        libraryData.updatedBy = updatedBy;
        const library = await libraryCreationService.addLibrary(libraryData, transaction);

        // const libraryCreationId = library.dataValues.libraryCreationId;

        const libraryCreationId = library?.dataValues?.libraryCreationId;
        if (!libraryCreationId) throw new Error('libraryCreationId not returned');
        
        // Add authorities
        for (const auth of libraryData.authorities) {
            await libraryCreationService.addLibraryAuthority({
                libraryCreationId,
                createdBy,
                updatedBy,
                ...auth
            }, transaction);
        }

        await transaction.commit();
    } catch (error) {
        // Rollback the transaction in case of error
        await transaction.rollback();
        console.error('Error adding library and authorities:', error);
        throw error;
    }
};

export async function getLibraryDetails(universityId) {
    return await libraryCreationService.getLibraryDetails(universityId);
}

export async function getSingleLibraryDetails(libraryCreationId,universityId) {
    return await libraryCreationService.getSingleLibraryDetails(libraryCreationId,universityId);
}

export async function deleteLibray(libraryCreationId) {
    return await libraryCreationService.deleteLibray(libraryCreationId);
}

export async function updateLibrary(libraryCreationId, libraryData, updatedBy) {    
    const transaction = await sequelize.transaction();

    try {
        // Update library data
        libraryData.updatedBy = updatedBy;
        await libraryCreationService.updateLibrary(libraryCreationId, libraryData, transaction);

        // Update authorities 
        const authorityUpdates = libraryData.authorities.map(auth => {
            const { libraryAuthorityId } = auth;
            return libraryCreationService.updateLibraryAuthority(libraryAuthorityId, {
                updatedBy,
                ...auth
            }, transaction);
        });

        await Promise.all(authorityUpdates);

        await transaction.commit();
        console.log(`Successfully updated library and authorities.`);
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating library and authorities:', error);
        throw error; 
    }
}