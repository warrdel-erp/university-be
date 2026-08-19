import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function createBundle(bundleData, itemsData) {
    const transaction = await model.examRoomMaterialBundleModel.sequelize.transaction();
    try {
        const bundle = await scoped(model.examRoomMaterialBundleModel).create(bundleData, { transaction });
        
        const items = itemsData.map(item => ({
            ...item,
            examRoomMaterialBundleId: bundle.examRoomMaterialBundleId,
            createdBy: bundleData.createdBy,
            updatedBy: bundleData.updatedBy
        }));
        
        const createdItems = await model.examRoomMaterialItemModel.bulkCreate(items, { transaction });
        
        await transaction.commit();
        
        return {
            ...bundle.get({ plain: true }),
            examRoomMaterialItems: createdItems
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function getBundleById(examRoomMaterialBundleId) {
    return scoped(model.examRoomMaterialBundleModel).findOne({
        where: { examRoomMaterialBundleId },
        include: [
            {
                model: model.examRoomMaterialItemModel,
                as: "examRoomMaterialItems",
            },
            {
                model: model.examinationSessionSlotModel,
                as: "examinationSessionSlot",
            },
            {
                model: model.classRoomModel,
                as: "classRoomSection",
            }
        ]
    });
}

export async function updateBundleStatus(examRoomMaterialBundleId, statusData) {
    const { status, remarks, user, issuedTo } = statusData;
    const bundle = await scoped(model.examRoomMaterialBundleModel).findOne({
        where: { examRoomMaterialBundleId }
    });
    
    if (!bundle) return null;
    
    const updates = {
        status,
        remarks: remarks !== undefined ? remarks : bundle.remarks,
        updatedBy: user.userId
    };
    
    if (status === "ISSUED") {
        updates.issuedTo = issuedTo || bundle.issuedTo;
        updates.issuedBy = user.userId;
        updates.issuedAt = new Date();
    } else if (status === "RECEIVED") {
        updates.receivedBy = user.userId;
        updates.receivedAt = new Date();
    } else if (status === "VERIFIED") {
        updates.verifiedBy = user.userId;
        updates.verifiedAt = new Date();
    }
    
    await bundle.update(updates);
    return bundle;
}
