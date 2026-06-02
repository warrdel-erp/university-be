import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/assetLocationRepository.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function updatePayload(body) {
  const { assetLocationId, ...rest } = body;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

function toPlain(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

export async function addAssetLocation(body, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    const asset = await repo.findAssetByIdForInstitute(body.assetId, instituteId, { transaction });
    if (!asset) {
      throw httpError("assetId not found or not in your institute", 404);
    }

    const classRoomSection = await repo.findClassRoomSectionById(body.classRoomSectionId, {
      transaction,
    });
    if (!classRoomSection) {
      throw httpError("classRoomSectionId not found", 404);
    }

    const created = await repo.createAssetLocation(
      {
        assetId: body.assetId,
        classRoomSectionId: body.classRoomSectionId,
        count: body.count,
        instituteId,
      },
      { transaction }
    );

    return repo.findAssetLocationById(created.assetLocationId, instituteId, { transaction });
  });

  return toPlain(row);
}

export async function listAssetLocations(instituteId, query = {}) {
  const rows = await sequelize.transaction(async (transaction) =>
    repo.findAssetLocationsByInstitute(instituteId, {
      assetId: query.assetId,
      transaction,
    })
  );
  return rows.map(toPlain);
}

export async function getSingleAssetLocation(assetLocationId, instituteId) {
  const row = await sequelize.transaction(async (transaction) =>
    repo.findAssetLocationById(assetLocationId, instituteId, { transaction })
  );
  return toPlain(row);
}

export async function updateAssetLocation(assetLocationId, body, instituteId) {
  const updated = await sequelize.transaction(async (transaction) => {
    const existing = await repo.findAssetLocationById(assetLocationId, instituteId, { transaction });
    if (!existing) {
      throw httpError("Asset location not found or not in your institute", 404);
    }

    const payload = updatePayload(body);

    if (payload.assetId !== undefined) {
      const asset = await repo.findAssetByIdForInstitute(payload.assetId, instituteId, { transaction });
      if (!asset) {
        throw httpError("assetId not found or not in your institute", 404);
      }
    }

    if (payload.classRoomSectionId !== undefined) {
      const classRoomSection = await repo.findClassRoomSectionById(payload.classRoomSectionId, {
        transaction,
      });
      if (!classRoomSection) {
        throw httpError("classRoomSectionId not found", 404);
      }
    }

    const affected = await repo.updateAssetLocation(assetLocationId, instituteId, payload, {
      transaction,
    });
    if (!affected) {
      throw httpError("Update failed", 500);
    }

    return repo.findAssetLocationById(assetLocationId, instituteId, { transaction });
  });

  return toPlain(updated);
}

export async function deleteAssetLocation(assetLocationId, instituteId) {
  await sequelize.transaction(async (transaction) => {
    const ok = await repo.deleteAssetLocation(assetLocationId, instituteId, { transaction });
    if (!ok) {
      throw httpError("Asset location not found or not in your institute", 404);
    }
  });
  return true;
}
