import sequelize from "../database/sequelizeConfig.js";
import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";
import { normalizeVendorName } from "../utility/amcVendorCode.js";

const excludeTs = ["createdAt", "updatedAt"];

const vendorCategoryInclude = {
  model: model.assetCategoryModel.unscoped(),
  as: "vendorCategory",
  attributes: ["assetCategoryId", "name", "codePrefix"],
};

const vendorAddressInclude = {
  model: model.amcVendorAddressModel,
  as: "vendorAddress",
  attributes: { exclude: excludeTs },
  required: false,
};

const vendorDetailIncludes = [vendorCategoryInclude, vendorAddressInclude];

function formatVendorAddress(addressPlain) {
  if (!addressPlain) {
    return null;
  }

  return {
    amcVendorAddressId: addressPlain.amcVendorAddressId,
    addressLine: addressPlain.addressLine,
    city: addressPlain.city,
    state: addressPlain.state,
    country: addressPlain.country,
    pincode: addressPlain.pincode,
  };
}

function formatVendorRow(row) {
  const plain = typeof row.get === "function" ? row.get({ plain: true }) : row;
  const categoryName = plain.vendorCategory?.name ?? null;

  return {
    amcVendorId: plain.amcVendorId,
    vendorName: plain.vendorName,
    vendorCode: plain.vendorCode,
    contactPerson: plain.contactPerson,
    phone: plain.phone,
    email: plain.email,
    address: formatVendorAddress(plain.vendorAddress),
    gstNumber: plain.gstNumber,
    assetCategoryId: plain.assetCategoryId,
    vendorCategory: categoryName,
    instituteId: plain.instituteId,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

async function assertScopedVendor(amcVendorId, options = {}) {
  return scoped(model.amcVendorModel).findOne({
    where: { amcVendorId },
    attributes: ["amcVendorId"],
    transaction: options.transaction,
  });
}

export async function createAmcVendor(data, options = {}) {
  return scoped(model.amcVendorModel).create(data, { transaction: options.transaction });
}

export async function createAmcVendorAddress(data, options = {}) {
  return model.amcVendorAddressModel.create(data, { transaction: options.transaction });
}

export async function findAmcVendorAddressByVendorId(amcVendorId, options = {}) {
  const vendor = await assertScopedVendor(amcVendorId, options);
  if (!vendor) {
    return null;
  }

  return model.amcVendorAddressModel.findOne({
    where: { amcVendorId },
    transaction: options.transaction,
  });
}

export async function upsertAmcVendorAddress(amcVendorId, payload, options = {}) {
  const vendor = await assertScopedVendor(amcVendorId, options);
  if (!vendor) {
    return;
  }

  const existing = await model.amcVendorAddressModel.findOne({
    where: { amcVendorId },
    transaction: options.transaction,
  });

  if (existing) {
    await model.amcVendorAddressModel.update(payload, {
      where: { amcVendorId },
      transaction: options.transaction,
    });
    return;
  }

  await createAmcVendorAddress({ amcVendorId, ...payload }, options);
}

export async function findAssetCategoryByIdForInstitute(assetCategoryId, options = {}) {
  return scoped(model.assetCategoryModel).findOne({
    attributes: ["assetCategoryId", "name", "codePrefix"],
    where: { assetCategoryId },
    transaction: options.transaction,
  });
}

export async function findAmcVendorByCode(vendorCode, options = {}) {
  return scoped(model.amcVendorModel).findOne({
    attributes: ["amcVendorId"],
    where: { vendorCode },
    transaction: options.transaction,
  });
}

export async function findAmcVendorByName(vendorName, options = {}) {
  const { excludeAmcVendorId, transaction } = options;
  const normalized = normalizeVendorName(vendorName).toLowerCase();

  const where = {
    [Op.and]: sequelize.where(
      sequelize.fn("LOWER", sequelize.fn("TRIM", sequelize.col("vendor_name"))),
      normalized
    ),
  };

  if (excludeAmcVendorId !== undefined) {
    where.amcVendorId = { [Op.ne]: excludeAmcVendorId };
  }

  return scoped(model.amcVendorModel).findOne({
    attributes: ["amcVendorId", "vendorName", "vendorCode"],
    where,
    transaction,
  });
}

export async function findAmcVendors(options = {}) {
  const { search, page = 1, limit = 20 } = options;
  const where = {};

  if (search) {
    const term = `%${search}%`;
    where[Op.or] = [
      { vendorName: { [Op.like]: term } },
      { vendorCode: { [Op.like]: term } },
      { contactPerson: { [Op.like]: term } },
      { phone: { [Op.like]: term } },
      { email: { [Op.like]: term } },
      { gstNumber: { [Op.like]: term } },
      { "$vendorCategory.name$": { [Op.like]: term } },
      { "$vendorAddress.addressLine$": { [Op.like]: term } },
      { "$vendorAddress.city$": { [Op.like]: term } },
      { "$vendorAddress.state$": { [Op.like]: term } },
      { "$vendorAddress.country$": { [Op.like]: term } },
      { "$vendorAddress.pincode$": { [Op.like]: term } },
    ];
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await scoped(model.amcVendorModel).findAndCountAll({
    attributes: { exclude: excludeTs },
    where,
    include: vendorDetailIncludes,
    order: [["amcVendorId", "DESC"]],
    limit,
    offset,
    transaction: options.transaction,
    subQuery: false,
  });

  return {
    rows: rows.map(formatVendorRow),
    total: count,
    page,
    limit,
  };
}

export async function findAmcVendorById(amcVendorId, options = {}) {
  const row = await scoped(model.amcVendorModel).findOne({
    attributes: { exclude: excludeTs },
    where: { amcVendorId },
    include: vendorDetailIncludes,
    transaction: options.transaction,
  });

  return row ? formatVendorRow(row) : null;
}

export async function updateAmcVendor(amcVendorId, payload, options = {}) {
  const [affected] = await scoped(model.amcVendorModel).update(payload, {
    where: { amcVendorId },
    transaction: options.transaction,
  });
  return affected;
}

export async function deleteAmcVendor(amcVendorId, options = {}) {
  const deleted = await scoped(model.amcVendorModel).destroy({
    where: { amcVendorId },
    transaction: options.transaction,
  });
  return deleted > 0;
}
