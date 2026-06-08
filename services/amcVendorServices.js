import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/amcVendorRepository.js";
import {
  buildVendorCodeFromSlug,
  deriveVendorSlugCandidates,
  normalizeVendorName,
} from "../utility/amcVendorCode.js";

const CODE_CONFLICT_MESSAGE =
  "Vendor code already exists. Please use a different full vendor name.";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function updatePayload(body) {
  const { amcVendorId, vendorCode, address, ...rest } = body;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

function addressPayload(address) {
  if (address === undefined || address === null) {
    return null;
  }

  return {
    addressLine: address.addressLine ?? null,
    city: address.city ?? null,
    state: address.state ?? null,
    country: address.country ?? null,
    pincode: address.pincode ?? null,
  };
}

async function resolveVendorCategory(assetCategoryId, instituteId, transaction) {
  const category = await repo.findAssetCategoryByIdForInstitute(assetCategoryId, instituteId, {
    transaction,
  });
  if (!category) {
    throw httpError("assetCategoryId not found or not in your institute", 404);
  }
  return category;
}

function currentRegistrationYear() {
  return new Date().getFullYear();
}

async function assertVendorNameAvailable(
  vendorName,
  instituteId,
  transaction,
  excludeAmcVendorId
) {
  const duplicate = await repo.findAmcVendorByName(instituteId, vendorName, {
    transaction,
    excludeAmcVendorId,
  });

  if (duplicate) {
    throw httpError(
      `Vendor name "${normalizeVendorName(vendorName)}" already exists in your institute`,
      409
    );
  }
}

async function resolveUniqueVendorCode(
  categoryPrefix,
  vendorName,
  instituteId,
  transaction
) {
  const year = currentRegistrationYear();
  const slugCandidates = deriveVendorSlugCandidates(vendorName);

  for (const slug of slugCandidates) {
    const vendorCode = buildVendorCodeFromSlug(categoryPrefix, slug, year);
    const taken = await repo.findAmcVendorByCode(instituteId, vendorCode, { transaction });
    if (!taken) {
      return vendorCode;
    }
  }

  throw httpError(CODE_CONFLICT_MESSAGE, 409);
}

async function resolveVendorCode(
  vendorName,
  assetCategoryId,
  instituteId,
  transaction,
  excludeAmcVendorId
) {
  const category = await resolveVendorCategory(assetCategoryId, instituteId, transaction);
  await assertVendorNameAvailable(vendorName, instituteId, transaction, excludeAmcVendorId);

  const vendorCode = await resolveUniqueVendorCode(
    category.codePrefix,
    vendorName,
    instituteId,
    transaction
  );

  return {
    vendorCode,
    category,
  };
}

export async function addAmcVendor(body, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    const { vendorCode } = await resolveVendorCode(
      body.vendorName,
      body.assetCategoryId,
      instituteId,
      transaction
    );

    const created = await repo.createAmcVendor(
      {
        vendorName: normalizeVendorName(body.vendorName),
        vendorCode,
        contactPerson: body.contactPerson ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        gstNumber: body.gstNumber ?? null,
        assetCategoryId: body.assetCategoryId,
        instituteId,
      },
      { transaction }
    );

    const address = addressPayload(body.address);
    if (address) {
      await repo.createAmcVendorAddress(
        {
          amcVendorId: created.amcVendorId,
          ...address,
        },
        { transaction }
      );
    }

    return repo.findAmcVendorById(created.amcVendorId, instituteId, { transaction });
  });

  return row;
}

export async function listAmcVendors(instituteId, query = {}) {
  return sequelize.transaction(async (transaction) =>
    repo.findAmcVendorsByInstitute(instituteId, { ...query, transaction })
  );
}

export async function getSingleAmcVendor(amcVendorId, instituteId) {
  return sequelize.transaction(async (transaction) =>
    repo.findAmcVendorById(amcVendorId, instituteId, { transaction })
  );
}

export async function updateAmcVendor(amcVendorId, body, instituteId) {
  return sequelize.transaction(async (transaction) => {
    const existing = await repo.findAmcVendorById(amcVendorId, instituteId, { transaction });
    if (!existing) {
      throw httpError("AMC vendor not found or not in your institute", 404);
    }

    const payload = updatePayload(body);

    if (payload.assetCategoryId !== undefined) {
      await resolveVendorCategory(payload.assetCategoryId, instituteId, transaction);
    }

    if (payload.vendorName !== undefined) {
      payload.vendorName = normalizeVendorName(payload.vendorName);
      await assertVendorNameAvailable(payload.vendorName, instituteId, transaction, amcVendorId);
    }

    if (Object.keys(payload).length) {
      const affected = await repo.updateAmcVendor(amcVendorId, instituteId, payload, {
        transaction,
      });
      if (!affected) {
        throw httpError("AMC vendor not found or not in your institute", 404);
      }
    }

    const address = addressPayload(body.address);
    if (address) {
      await repo.upsertAmcVendorAddress(amcVendorId, address, { transaction });
    }

    return repo.findAmcVendorById(amcVendorId, instituteId, { transaction });
  });
}

export async function deleteAmcVendor(amcVendorId, instituteId) {
  await sequelize.transaction(async (transaction) => {
    const ok = await repo.deleteAmcVendor(amcVendorId, instituteId, { transaction });
    if (!ok) {
      throw httpError("AMC vendor not found or not in your institute", 404);
    }
  });
  return true;
}

export async function previewVendorCode(vendorName, assetCategoryId, instituteId) {
  return sequelize.transaction(async (transaction) => {
    const category = await resolveVendorCategory(assetCategoryId, instituteId, transaction);
    const nameDuplicate = await repo.findAmcVendorByName(instituteId, vendorName, { transaction });

    if (nameDuplicate) {
      return {
        vendorName,
        assetCategoryId,
        vendorCategory: category.name,
        vendorCode: null,
        vendorNameExists: true,
        vendorCodeExists: false,
      };
    }

    try {
      const vendorCode = await resolveUniqueVendorCode(
        category.codePrefix,
        vendorName,
        instituteId,
        transaction
      );

      return {
        vendorName,
        assetCategoryId,
        vendorCategory: category.name,
        vendorCode,
        vendorNameExists: false,
        vendorCodeExists: false,
      };
    } catch (error) {
      if (error.statusCode === 409) {
        return {
          vendorName,
          assetCategoryId,
          vendorCategory: category.name,
          vendorCode: null,
          vendorNameExists: false,
          vendorCodeExists: true,
        };
      }
      throw error;
    }
  });
}
