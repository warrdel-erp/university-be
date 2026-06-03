import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/assetLocationRepository.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function updatePayload(body) {
  const { assetLocationId, ...rest } = body;
  return Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined));
}

async function validateClassRoomSection(classRoomSectionId, transaction) {
  const room = await repo.findClassRoomSectionById(classRoomSectionId, { transaction });
  if (!room) {
    throw httpError("classRoomSectionId not found", 404);
  }
}

export async function addAssetLocation(body, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    await validateClassRoomSection(body.classRoomSectionId, transaction);

    const existing = await repo.findAssetLocationByClassRoomSection(
      body.classRoomSectionId,
      instituteId,
      { transaction }
    );
    if (existing) {
      throw httpError("Asset location already exists for this room", 409);
    }

    const created = await repo.createAssetLocation(
      {
        classRoomSectionId: body.classRoomSectionId,
        instituteId,
      },
      { transaction }
    );
    return repo.findAssetLocationById(created.assetLocationId, instituteId, { transaction });
  });

  return row?.get ? row.get({ plain: true }) : row;
}

export async function listAssetLocations(instituteId) {
  const rows = await sequelize.transaction(async (transaction) =>
    repo.findAssetLocationsByInstitute(instituteId, { transaction })
  );
  return rows.map((row) => (row.get ? row.get({ plain: true }) : row));
}

export async function getSingleAssetLocation(assetLocationId, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    const found = await repo.findAssetLocationById(assetLocationId, instituteId, { transaction });
    if (!found) {
      throw httpError("Asset location not found", 404);
    }
    return found;
  });

  return row?.get ? row.get({ plain: true }) : row;
}

export async function updateAssetLocation(assetLocationId, body, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    await validateClassRoomSection(body.classRoomSectionId, transaction);

    const duplicate = await repo.findAssetLocationByClassRoomSection(
      body.classRoomSectionId,
      instituteId,
      { transaction, excludeAssetLocationId: assetLocationId }
    );
    if (duplicate) {
      throw httpError("Asset location already exists for this room", 409);
    }

    const payload = updatePayload(body);
    const affected = await repo.updateAssetLocation(assetLocationId, instituteId, payload, {
      transaction,
    });
    if (!affected) {
      throw httpError("Asset location not found or not in your institute", 404);
    }

    return repo.findAssetLocationById(assetLocationId, instituteId, { transaction });
  });

  return row?.get ? row.get({ plain: true }) : row;
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
