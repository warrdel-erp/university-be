import * as model from '../models/index.js'
import { buildScope, scoped } from '../utility/scoped.js';

async function isFloorInInstitute(floorId) {
    const instituteId = buildScope(model.buildingModel).instituteId;
    if (!instituteId || !floorId) {
        return false;
    }

    const floor = await scoped(model.floorModel).findOne({
        where: { floorId },
        attributes: ['floorId'],
        include: [
            {
                model: model.buildingModel,
                as: 'floorBuilding',
                required: true,
                attributes: ['buildingId'],
                where: buildScope(model.buildingModel),
            },
        ],
    });

    return Boolean(floor);
}

export async function addClassRoom(ClassRoomData) {
    try {
        if (!(await isFloorInInstitute(ClassRoomData.floorId))) {
            throw new Error('Floor not found for this institute');
        }

        return await scoped(model.classRoomModel).create(ClassRoomData);
    } catch (error) {
        console.error('Error in add ClassRoom :', error);
        throw error;
    }
}

export async function getClassRoomDetails() {
    try {
        return await scoped(model.classRoomModel).findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
            include: [
                {
                    model: model.floorModel,
                    as: 'roomFloor',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                    include: [
                        {
                            model: model.buildingModel,
                            as: 'floorBuilding',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error('Error fetching ClassRoom details:', error);
        throw error;
    }
}

export async function getSingleClassRoomDetails(classRoomSectionId) {
    try {
        return await scoped(model.classRoomModel).findOne({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
            where: { classRoomSectionId },
            include: [
                {
                    model: model.floorModel,
                    as: 'roomFloor',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                    include: [
                        {
                            model: model.buildingModel,
                            as: 'floorBuilding',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error('Error fetching ClassRoom details:', error);
        throw error;
    }
}
export async function deleteClassRoom(classRoomSectionId) {
    const deleted = await scoped(model.classRoomModel).destroy({
        where: { classRoomSectionId },
    });
    return deleted > 0;
}

export async function updateClassRoom(classRoomSectionId, ClassRoomData) {
    try {
        if (ClassRoomData.floorId && !(await isFloorInInstitute(ClassRoomData.floorId))) {
            throw new Error('Floor not found for this institute');
        }

        const [updatedCount] = await scoped(model.classRoomModel).update(ClassRoomData, {
            where: { classRoomSectionId },
        });
        return updatedCount;
    } catch (error) {
        console.error(`Error updating ClassRoom creation ${classRoomSectionId}:`, error);
        throw error;
    }
}
