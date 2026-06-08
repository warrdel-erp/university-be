import sequelize from "../database/sequelizeConfig.js";
import { Op } from "sequelize";
import * as model from "../models/index.js";
import { normalizeVendorName } from "../utility/amcVendorCode.js";

const excludeTs = ["createdAt", "updatedAt"];

const vendorCategoryInclude = {
  model: model.assetCategoryModel,
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

export async function createAmcVendor(data, options = {}) {
  return model.amcVendorModel.create(data, { transaction: options.transaction });
}

export async function createAmcVendorAddress(data, options = {}) {
  return model.amcVendorAddressModel.create(data, { transaction: options.transaction });
}

export async function findAmcVendorAddressByVendorId(amcVendorId, options = {}) {
  return model.amcVendorAddressModel.findOne({
    where: { amcVendorId },
    transaction: options.transaction,
  });
}

export async function upsertAmcVendorAddress(amcVendorId, payload, options = {}) {
  const existing = await findAmcVendorAddressByVendorId(amcVendorId, options);

  if (existing) {
    await model.amcVendorAddressModel.update(payload, {
      where: { amcVendorId },
      transaction: options.transaction,
    });
    return;
  }

  await createAmcVendorAddress({ amcVendorId, ...payload }, options);
}

export async function findAssetCategoryByIdForInstitute(assetCategoryId, instituteId, options = {}) {
  return model.assetCategoryModel.findOne({
    attributes: ["assetCategoryId", "name", "codePrefix"],
    where: { assetCategoryId, instituteId },
    transaction: options.transaction,
  });
}

export async function findAmcVendorByCode(instituteId, vendorCode, options = {}) {
  return model.amcVendorModel.findOne({
    attributes: ["amcVendorId"],
    where: { instituteId, vendorCode },
    transaction: options.transaction,
  });
}

export async function findAmcVendorByName(instituteId, vendorName, options = {}) {
  const { excludeAmcVendorId, transaction } = options;
  const normalized = normalizeVendorName(vendorName).toLowerCase();

  const where = {
    instituteId,
    [Op.and]: sequelize.where(
      sequelize.fn("LOWER", sequelize.fn("TRIM", sequelize.col("vendor_name"))),
      normalized
    ),
  };

  if (excludeAmcVendorId !== undefined) {
    where.amcVendorId = { [Op.ne]: excludeAmcVendorId };
  }

  return model.amcVendorModel.findOne({
    attributes: ["amcVendorId", "vendorName", "vendorCode"],
    where,
    transaction,
  });
}

export async function findAmcVendorsByInstitute(instituteId, options = {}) {
  const { search, page = 1, limit = 20 } = options;
  const where = { instituteId };

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

  const { rows, count } = await model.amcVendorModel.findAndCountAll({
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

export async function findAmcVendorById(amcVendorId, instituteId, options = {}) {
  const row = await model.amcVendorModel.findOne({
    attributes: { exclude: excludeTs },
    where: { amcVendorId, instituteId },
    include: vendorDetailIncludes,
    transaction: options.transaction,
  });

  return row ? formatVendorRow(row) : null;
}

export async function updateAmcVendor(amcVendorId, instituteId, payload, options = {}) {
  const [affected] = await model.amcVendorModel.update(payload, {
    where: { amcVendorId, instituteId },
    transaction: options.transaction,
  });
  return affected;
}

export async function deleteAmcVendor(amcVendorId, instituteId, options = {}) {
  const deleted = await model.amcVendorModel.destroy({
    where: { amcVendorId, instituteId },
    transaction: options.transaction,
  });
  return deleted > 0;
}
