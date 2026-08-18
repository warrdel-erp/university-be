import * as examRoomMaterialBundleRepository from "../repository/examRoomMaterialBundleRepository.js";

export async function createBundle(bundleData, itemsData) {
    return examRoomMaterialBundleRepository.createBundle(bundleData, itemsData);
}

export async function getBundleById(examRoomMaterialBundleId) {
    return examRoomMaterialBundleRepository.getBundleById(examRoomMaterialBundleId);
}

export async function updateBundleStatus(examRoomMaterialBundleId, statusData) {
    return examRoomMaterialBundleRepository.updateBundleStatus(examRoomMaterialBundleId, statusData);
}
