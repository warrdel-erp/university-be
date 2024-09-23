import * as model from '../models/index.js'

export async function addLibraryItem(data,transaction) {    
    try {
        const result = await model.libraryAddItemModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add library item :", error);
        throw error;
    }
};

export async function getLibraryItemDetails(universityId) {
    try {
        const librariesItem = await model.libraryAddItemModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","instituteId","createdBy","updatedBy"] },
            include: [
                {
                    model: model.userModel,
                    as: "userLibraryAddItem",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model: model.employeeCodeMasterType,
                    as: "genres",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
                {
                    model: model.employeeCodeMasterType,
                    as: "aisles",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
                {
                    model: model.employeeCodeMasterType,
                    as: "shelfs",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                }
            ]
        });

        return librariesItem;
    } catch (error) {
        console.error('Error fetching library details:', error);
        throw error;
    }
};

export async function deleteLibraryItem(libraryAddItemId) {
    const deleted = await model.libraryAddItemModel.destroy({ where: { libraryAddItemId: libraryAddItemId } });
    return deleted > 0;
}

export async function updateLibrayItem(libraryAddItemId, libraryData) {
    const [updated] = await model.libraryAddItemModel.update(libraryData, { where: { libraryAddItemId: libraryAddItemId } });
    return updated ? model.libraryAddItemModel.findOne({ where: { libraryAddItemId: libraryAddItemId } }) : null;
}