import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/assetLocationRepository.js";

function updatePayload(body) {
  const { assetLocationId, ...rest } = body;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

export async function addAssetLocation(body, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    const created = await repo.createAssetLocation(
      { name: body.name, instituteId },
      { transaction }
    );
    return created.get({ plain: true });
  });
  return row;
}

export async function listAssetLocations(instituteId) {
  return sequelize.transaction(async (transaction) =>
    repo.findAssetLocationsByInstitute(instituteId, { transaction })
  );
}

export async function getSingleAssetLocation(assetLocationId, instituteId) {
  return sequelize.transaction(async (transaction) =>
    repo.findAssetLocationById(assetLocationId, instituteId, { transaction })
  );
}

export async function updateAssetLocation(assetLocationId, body, instituteId) {
  return sequelize.transaction(async (transaction) => {
    const payload = updatePayload(body);
    const affected = await repo.updateAssetLocation(assetLocationId, instituteId, payload, {
      transaction,
    });
    if (!affected) {
      throw new Error("Asset location not found or not in your institute");
    }
    return repo.findAssetLocationById(assetLocationId, instituteId, { transaction });
  });
}

export async function deleteAssetLocation(assetLocationId, instituteId) {
  await sequelize.transaction(async (transaction) => {
    const ok = await repo.deleteAssetLocation(assetLocationId, instituteId, { transaction });
    if (!ok) {
      throw new Error("Asset location not found or not in your institute");
    }
  });
  return true;
}
