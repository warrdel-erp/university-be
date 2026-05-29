import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/assetRepository.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function updatePayload(body) {
  const { assetId, ...rest } = body;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

function toPlain(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

async function validateAssetReferences(body, instituteId, transaction) {
  if (body.assetCategoryId !== undefined) {
    const category = await repo.findAssetCategoryByIdForInstitute(
      body.assetCategoryId,
      instituteId,
      { transaction }
    );
    if (!category) {
      throw httpError("assetCategoryId not found or not in your institute", 404);
    }
  }

  if (body.departmentId !== undefined) {
    const department = await repo.findDepartmentById(body.departmentId, { transaction });
    if (!department) {
      throw httpError("departmentId not found", 404);
    }
  }
}

export async function addAsset(body, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    await validateAssetReferences(body, instituteId, transaction);

    const created = await repo.createAsset(
      {
        name: body.name,
        code: body.code,
        status: body.status,
        condition: body.condition,
        description: body.description ?? null,
        departmentId: body.departmentId,
        assetCategoryId: body.assetCategoryId,
        instituteId,
      },
      { transaction }
    );

    return repo.findAssetById(created.assetId, instituteId, { transaction });
  });

  return toPlain(row);
}

export async function listAssets(instituteId) {
  const rows = await sequelize.transaction(async (transaction) =>
    repo.findAssetsByInstitute(instituteId, { transaction })
  );
  return rows.map(toPlain);
}

export async function getSingleAsset(assetId, instituteId) {
  const row = await sequelize.transaction(async (transaction) =>
    repo.findAssetById(assetId, instituteId, { transaction })
  );
  return toPlain(row);
}

export async function updateAsset(assetId, body, instituteId) {
  const updated = await sequelize.transaction(async (transaction) => {
    const existing = await repo.findAssetById(assetId, instituteId, { transaction });
    if (!existing) {
      throw httpError("Asset not found or not in your institute", 404);
    }

    const payload = updatePayload(body);
    await validateAssetReferences(payload, instituteId, transaction);

    const affected = await repo.updateAsset(assetId, instituteId, payload, { transaction });
    if (!affected) {
      throw httpError("Update failed", 500);
    }

    return repo.findAssetById(assetId, instituteId, { transaction });
  });

  return toPlain(updated);
}

export async function deleteAsset(assetId, instituteId) {
  await sequelize.transaction(async (transaction) => {
    const ok = await repo.deleteAsset(assetId, instituteId, { transaction });
    if (!ok) {
      throw httpError("Asset not found or not in your institute", 404);
    }
  });
  return true;
}
