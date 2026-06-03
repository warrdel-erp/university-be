import * as repo from "../repository/assetRepository.js";

/** ISSUED only when every inventory copy has an open issue; otherwise IN_STOCK. */
export function deriveAssetStatusFromInventory(openIssues, totalInventory) {
  if (totalInventory === 0) {
    return "IN_STOCK";
  }
  return openIssues >= totalInventory ? "ISSUED" : "IN_STOCK";
}

export async function syncAssetStatusFromInventory(assetId, instituteId, options = {}) {
  const { transaction } = options;

  const asset = await repo.findAssetStatusById(assetId, instituteId, { transaction });
  if (!asset || asset.status === "MAINTANANCE") {
    return;
  }

  const totalInventory = await repo.countInventoryItemsByAsset(assetId, instituteId, { transaction });
  const openIssues = await repo.countOpenIssuesForAsset(assetId, instituteId, { transaction });
  const nextStatus = deriveAssetStatusFromInventory(openIssues, totalInventory);

  if (asset.status !== nextStatus) {
    await repo.updateAsset(assetId, instituteId, { status: nextStatus }, { transaction });
  }
}
