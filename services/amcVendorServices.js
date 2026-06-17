import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/amcVendorRepository.js";
import {
  buildVendorCodeFromSlug,
  deriveVendorSlugCandidates,
  normalizeVendorName,
} from "../utility/amcVendorCode.js";

const CODE_CONFLICT_MESSAGE =
  "Vendor code already exists. Please use a different full vendor name.";

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
    throw new Error("assetCategoryId not found or not in your institute");
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
    throw new Error(
      `Vendor name "${normalizeVendorName(vendorName)}" already exists in your institute`
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

  throw new Error(CODE_CONFLICT_MESSAGE);
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
  try {
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
  } catch (error) {
    throw new Error(`Failed to create AMC vendor: ${error.message}`);
  }
}

export async function listAmcVendors(instituteId, query = {}) {
  try {
    return await sequelize.transaction(async (transaction) =>
      repo.findAmcVendorsByInstitute(instituteId, { ...query, transaction })
    );
  } catch (error) {
    throw new Error(`Failed to fetch AMC vendors: ${error.message}`);
  }
}

export async function getSingleAmcVendor(amcVendorId, instituteId) {
  try {
    return await sequelize.transaction(async (transaction) =>
      repo.findAmcVendorById(amcVendorId, instituteId, { transaction })
    );
  } catch (error) {
    throw new Error(`Failed to fetch AMC vendor: ${error.message}`);
  }
}

export async function updateAmcVendor(amcVendorId, body, instituteId) {
  try {
    return await sequelize.transaction(async (transaction) => {
      const existing = await repo.findAmcVendorById(amcVendorId, instituteId, { transaction });
      if (!existing) {
        throw new Error("AMC vendor not found or not in your institute");
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
          throw new Error("AMC vendor not found or not in your institute");
        }
      }

      const address = addressPayload(body.address);
      if (address) {
        await repo.upsertAmcVendorAddress(amcVendorId, address, { transaction });
      }

      return repo.findAmcVendorById(amcVendorId, instituteId, { transaction });
    });
  } catch (error) {
    throw new Error(`Failed to update AMC vendor: ${error.message}`);
  }
}

export async function deleteAmcVendor(amcVendorId, instituteId) {
  try {
    await sequelize.transaction(async (transaction) => {
      const ok = await repo.deleteAmcVendor(amcVendorId, instituteId, { transaction });
      if (!ok) {
        throw new Error("AMC vendor not found or not in your institute");
      }
    });
    return true;
  } catch (error) {
    throw new Error(`Failed to delete AMC vendor: ${error.message}`);
  }
}

export async function previewVendorCode(vendorName, assetCategoryId, instituteId) {
  try {
    return await sequelize.transaction(async (transaction) => {
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
        if (error.message === CODE_CONFLICT_MESSAGE) {
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
  } catch (error) {
    throw new Error(`Failed to preview vendor code: ${error.message}`);
  }
}
