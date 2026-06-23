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

async function resolveVendorCategory(assetCategoryId, transaction) {
  const category = await repo.findAssetCategoryByIdForInstitute(assetCategoryId, {
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

async function assertVendorNameAvailable(vendorName, transaction, excludeAmcVendorId) {
  const duplicate = await repo.findAmcVendorByName(vendorName, {
    transaction,
    excludeAmcVendorId,
  });

  if (duplicate) {
    throw new Error(
      `Vendor name "${normalizeVendorName(vendorName)}" already exists in your institute`
    );
  }
}

async function resolveUniqueVendorCode(categoryPrefix, vendorName, transaction) {
  const year = currentRegistrationYear();
  const slugCandidates = deriveVendorSlugCandidates(vendorName);

  for (const slug of slugCandidates) {
    const vendorCode = buildVendorCodeFromSlug(categoryPrefix, slug, year);
    const taken = await repo.findAmcVendorByCode(vendorCode, { transaction });
    if (!taken) {
      return vendorCode;
    }
  }

  throw new Error(CODE_CONFLICT_MESSAGE);
}

async function resolveVendorCode(vendorName, assetCategoryId, transaction, excludeAmcVendorId) {
  const category = await resolveVendorCategory(assetCategoryId, transaction);
  await assertVendorNameAvailable(vendorName, transaction, excludeAmcVendorId);

  const vendorCode = await resolveUniqueVendorCode(
    category.codePrefix,
    vendorName,
    transaction
  );

  return {
    vendorCode,
    category,
  };
}

export async function addAmcVendor(body) {
  try {
    const row = await sequelize.transaction(async (transaction) => {
      const { vendorCode } = await resolveVendorCode(
        body.vendorName,
        body.assetCategoryId,
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

      return repo.findAmcVendorById(created.amcVendorId, { transaction });
    });

    return row;
  } catch (error) {
    throw new Error(`Failed to create AMC vendor: ${error.message}`);
  }
}

export async function listAmcVendors(query = {}) {
  try {
    return await sequelize.transaction(async (transaction) =>
      repo.findAmcVendors({ ...query, transaction })
    );
  } catch (error) {
    throw new Error(`Failed to fetch AMC vendors: ${error.message}`);
  }
}

export async function getSingleAmcVendor(amcVendorId) {
  try {
    return await sequelize.transaction(async (transaction) =>
      repo.findAmcVendorById(amcVendorId, { transaction })
    );
  } catch (error) {
    throw new Error(`Failed to fetch AMC vendor: ${error.message}`);
  }
}

export async function updateAmcVendor(amcVendorId, body) {
  try {
    return await sequelize.transaction(async (transaction) => {
      const existing = await repo.findAmcVendorById(amcVendorId, { transaction });
      if (!existing) {
        throw new Error("AMC vendor not found or not in your institute");
      }

      const payload = updatePayload(body);

      if (payload.assetCategoryId !== undefined) {
        await resolveVendorCategory(payload.assetCategoryId, transaction);
      }

      if (payload.vendorName !== undefined) {
        payload.vendorName = normalizeVendorName(payload.vendorName);
        await assertVendorNameAvailable(payload.vendorName, transaction, amcVendorId);
      }

      if (Object.keys(payload).length) {
        const affected = await repo.updateAmcVendor(amcVendorId, payload, {
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

      return repo.findAmcVendorById(amcVendorId, { transaction });
    });
  } catch (error) {
    throw new Error(`Failed to update AMC vendor: ${error.message}`);
  }
}

export async function deleteAmcVendor(amcVendorId) {
  try {
    await sequelize.transaction(async (transaction) => {
      const ok = await repo.deleteAmcVendor(amcVendorId, { transaction });
      if (!ok) {
        throw new Error("AMC vendor not found or not in your institute");
      }
    });
    return true;
  } catch (error) {
    throw new Error(`Failed to delete AMC vendor: ${error.message}`);
  }
}

export async function previewVendorCode(vendorName, assetCategoryId) {
  try {
    return await sequelize.transaction(async (transaction) => {
      const category = await resolveVendorCategory(assetCategoryId, transaction);
      const nameDuplicate = await repo.findAmcVendorByName(vendorName, { transaction });

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
