import * as model from '../models/index.js'
import { buildScope, scoped } from '../utility/scoped.js';
import { requestContext } from '../utility/requestContext.js';
import { getCampusIdByInstituteId } from './buildingRepository.js';

const excludeMeta = ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'];

const classRoomInclude = [
    {
        model: model.floorModel,
        as: 'roomFloor',
        attributes: { exclude: excludeMeta },
        include: [
            {
                model: model.buildingModel,
                as: 'floorBuilding',
                attributes: { exclude: excludeMeta },
            },
        ],
    },
];

async function isFloorInInstitute(floorId) {
    const instituteId = buildScope(model.classRoomModel).instituteId;
    const universityId = requestContext.getStore()?.universityId;

    if (!instituteId || !universityId || !floorId) {
        return false;
    }

    const campusId = await getCampusIdByInstituteId(instituteId);
    const campus = await model.campusModel.findOne({
        where: { campusId, universityId },
        attributes: ['campusId'],
    });
    if (!campus) {
        return false;
    }

    const floor = await model.floorModel.findOne({
        where: { floorId },
        attributes: ['floorId'],
        include: [
            {
                model: model.buildingModel,
                as: 'floorBuilding',
                required: true,
                where: { campusId: campus.campusId },
                attributes: ['buildingId'],
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
            attributes: { exclude: excludeMeta },
            include: classRoomInclude,
        });
    } catch (error) {
        console.error('Error fetching ClassRoom details:', error);
        throw error;
    }
}

export async function getSingleClassRoomDetails(classRoomSectionId) {
    try {
        return await scoped(model.classRoomModel).findOne({
            attributes: { exclude: excludeMeta },
            where: { classRoomSectionId },
            include: classRoomInclude,
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
