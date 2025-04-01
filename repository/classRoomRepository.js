import * as model from '../models/index.js'

export async function addClassRoom(ClassRoomData) {
    try {
        const result = await model.classRoomModel.create(ClassRoomData);
        return result;
    } catch (error) {
        console.error("Error in add ClassRoom :", error);
        throw error;
    }
};

export async function getClassRoomDetails(universityId) {
    try {
        const classRoom = await model.classRoomModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            include:
                [
                    {
                        model: model.floorModel,
                        as: "roomFloor",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                        include: [
                            {
                                model: model.buildingModel,
                                as: "floorBuilding",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                            },
                        ]
                    },
                ]
        });

        return classRoom;
    } catch (error) {
        console.error('Error fetching ClassRoom details:', error);
        throw error;
    }
}


export async function getSingleClassRoomDetails(classRoomSectionId) {
    try {
        const ClassRoom = await model.classRoomModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { classRoomSectionId },
            include:
                [
                    {
                        model: model.floorModel,
                        as: "roomFloor",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                        include: [
                            {
                                model: model.buildingModel,
                                as: "floorBuilding",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                            },
                        ]
                    },
                ]
        });

        return ClassRoom;
    } catch (error) {
        console.error('Error fetching ClassRoom details:', error);
        throw error;
    }
}

export async function deleteClassRoom(classRoomSectionId) {
    const deleted = await model.classRoomModel.destroy({ where: { classRoomSectionId: classRoomSectionId } });
    return deleted > 0;
}

export async function updateClassRoom(classRoomSectionId, ClassRoomData) {
    try {
        const result = await model.classRoomModel.update(ClassRoomData, {
            where: { classRoomSectionId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating ClassRoom creation ${classRoomSectionId}:`, error);
        throw error;
    }
}