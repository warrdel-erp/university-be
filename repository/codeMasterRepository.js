import * as model from "../models/index.js";

import { Op } from "sequelize";

import { scoped } from "../utility/scoped.js";

import { buildScope } from "../utility/scoped.js";

const excludeMeta = ["createdAt", "updatedAt", "deletedAt"];

const excludeTypeMeta = [...excludeMeta, "employee_code_master_id"];

function dedupeCategoriesByType(rows) {
  const byType = new Map();

  for (const row of rows) {
    const plain = row.get ? row.get({ plain: true }) : row;

    const key = String(plain.codeMasterType ?? "").toLowerCase();

    if (!key || byType.has(key)) {
      continue;
    }

    byType.set(key, row);
  }

  return [...byType.values()];
}

function dedupeCodesByValue(codes) {
  const byCode = new Map();

  for (const codeRow of codes) {
    const plain = codeRow.get ? codeRow.get({ plain: true }) : codeRow;

    const key = String(plain.code ?? "").toLowerCase();

    if (!key || byCode.has(key)) {
      continue;
    }

    byCode.set(key, plain);
  }

  return [...byCode.values()];
}

function groupScopedTypesByCategory(categories, codeTypeRows) {
  const codesByCategory = new Map();

  for (const row of codeTypeRows) {
    const plain = row.get ? row.get({ plain: true }) : row;

    const categoryId = plain.employeeCodeMasterId;

    if (!codesByCategory.has(categoryId)) {
      codesByCategory.set(categoryId, []);
    }

    codesByCategory.get(categoryId).push(plain);
  }

  return categories.map((cat) => {
    const plain = cat.get ? cat.get({ plain: true }) : cat;

    return {
      ...plain,

      codes: dedupeCodesByValue(
        codesByCategory.get(plain.employeeCodeMasterId) || [],
      ),
    };
  });
}

async function assertCodeValueUnique({
  employeeCodeMasterId,
  code,
  excludeTypeId,
}) {
  const existing = await scoped(model.employeeCodeMasterType).findOne({
    where: {
      employeeCodeMasterId,

      code,

      ...(excludeTypeId && {
        employeeCodeMasterTypeId: { [Op.ne]: excludeTypeId },
      }),
    },

    attributes: ["employeeCodeMasterTypeId"],
  });

  if (existing) {
    const error = new Error(
      "Code value already exists for this category in the active institute",
    );

    error.statusCode = 400;

    throw error;
  }
}

export async function getCodeMasterById(employeeCodeMasterId) {
  const master = await model.employeeCodeMaster.findOne({
    where: { employeeCodeMasterId },

    attributes: ["employeeCodeMasterId", "codeMasterType"],
  });

  if (!master) {
    const error = new Error("Code master category not found");

    error.statusCode = 404;

    throw error;
  }

  return master;
}

export async function getAllEmployeeType() {
  try {
    const rows = await model.employeeCodeMaster.findAll({
      attributes: { exclude: excludeMeta },

      order: [
        ["codeMasterType", "ASC"],
        ["employeeCodeMasterId", "ASC"],
      ],
    });

    return dedupeCategoriesByType(rows);
  } catch (error) {
    console.error("Error in getting all employee type:", error);

    throw error;
  }
}

export async function addEmployeeCode(data) {
  try {
    const { instituteId } = buildScope(model.employeeCodeMasterType);

    if (!instituteId) {
      const error = new Error(
        "Active institute is required to add code master value",
      );

      error.statusCode = 400;

      throw error;
    }

    await assertCodeValueUnique({
      employeeCodeMasterId: data.employeeCodeMasterId,

      code: data.code,
    });

    return scoped(model.employeeCodeMasterType).create(data);
  } catch (error) {
    console.error("Error in add employee code:", error);

    throw error;
  }
}

export async function getEmployeeCodesTypes(employeeCodeMasterId, key, search) {
  try {
    const trimmedSearch = search ? String(search).trim() : '';

    const categoryWhere = {
      ...(employeeCodeMasterId &&
        Number(employeeCodeMasterId) !== 0 && { employeeCodeMasterId: Number(employeeCodeMasterId) }),
      ...(key && { codeMasterType: key }),
    };

    const allCategories = await model.employeeCodeMaster.findAll({
      attributes: { exclude: excludeMeta },
      where: categoryWhere,
      order: [
        ["codeMasterType", "ASC"],
        ["employeeCodeMasterId", "ASC"],
      ],
    });

    const dedupedCategories = dedupeCategoriesByType(allCategories);
    if (!dedupedCategories.length) {
      return [];
    }

    const categoryIds = dedupedCategories.map((cat) => {
      const plain = cat.get ? cat.get({ plain: true }) : cat;
      return plain.employeeCodeMasterId;
    });

    if (!trimmedSearch) {
      const codeTypes = await scoped(model.employeeCodeMasterType).findAll({
        attributes: { exclude: excludeTypeMeta },
        where: { employeeCodeMasterId: { [Op.in]: categoryIds } },
        order: [
          ["employeeCodeMasterId", "ASC"],
          ["code", "ASC"],
        ],
      });
      return groupScopedTypesByCategory(dedupedCategories, codeTypes);
    }

    // Build search terms (handles singular / plural variations e.g. "Bachelors" & "Bachelor")
    const searchTerms = new Set([trimmedSearch]);
    if (trimmedSearch.endsWith('s') && trimmedSearch.length > 2) {
      searchTerms.add(trimmedSearch.slice(0, -1));
    }
    if (trimmedSearch.endsWith('es') && trimmedSearch.length > 3) {
      searchTerms.add(trimmedSearch.slice(0, -2));
    }

    const orConditions = [];
    for (const term of searchTerms) {
      const pattern = `%${term}%`;
      orConditions.push(
        { code: { [Op.like]: pattern } },
        { description: { [Op.like]: pattern } }
      );
    }

    // Find categories whose name matches search
    const matchingCategoryIds = new Set();
    for (const cat of dedupedCategories) {
      const typeName = (cat.codeMasterType || '').toLowerCase();
      for (const term of searchTerms) {
        if (typeName.includes(term.toLowerCase())) {
          matchingCategoryIds.add(cat.employeeCodeMasterId);
          break;
        }
      }
    }

    // Find code types matching search OR belonging to matching categories
    const codeTypeWhere = {
      employeeCodeMasterId: { [Op.in]: categoryIds },
      [Op.or]: [
        ...orConditions,
        ...(matchingCategoryIds.size > 0
          ? [{ employeeCodeMasterId: { [Op.in]: Array.from(matchingCategoryIds) } }]
          : []),
      ],
    };

    const codeTypes = await scoped(model.employeeCodeMasterType).findAll({
      attributes: { exclude: excludeTypeMeta },
      where: codeTypeWhere,
      order: [
        ["employeeCodeMasterId", "ASC"],
        ["code", "ASC"],
      ],
    });

    // When searching, only return categories that matched by name or contain matching codes
    const categoriesWithCodes = new Set(codeTypes.map((ct) => ct.employeeCodeMasterId));
    const filteredCategories = dedupedCategories.filter(
      (cat) => matchingCategoryIds.has(cat.employeeCodeMasterId) || categoriesWithCodes.has(cat.employeeCodeMasterId)
    );

    return groupScopedTypesByCategory(filteredCategories, codeTypes);
  } catch (error) {
    console.error(
      `Error in getting employee code and types for Id ${employeeCodeMasterId} or key ${key}:`,
      error
    );
    throw error;
  }
}

export async function updateCodeMasterType(employeeCodeMasterTypeId, info) {
  try {
    const existing = await scoped(model.employeeCodeMasterType).findOne({
      attributes: ["employeeCodeMasterTypeId", "employeeCodeMasterId", "code"],

      where: { employeeCodeMasterTypeId },
    });

    if (!existing) {
      return false;
    }

    if (info.code != null && info.code !== existing.code) {
      await assertCodeValueUnique({
        employeeCodeMasterId: existing.employeeCodeMasterId,

        code: info.code,

        excludeTypeId: employeeCodeMasterTypeId,
      });
    }

    await scoped(model.employeeCodeMasterType).update(info, {
      where: { employeeCodeMasterTypeId },
    });

    return true;
  } catch (error) {
    console.error(
      `Error updating code master type ${employeeCodeMasterTypeId}:`,
      error,
    );

    throw error;
  }
}

export async function deleteCodeMasterType(employeeCodeMasterTypeId) {
  try {
    const existing = await scoped(model.employeeCodeMasterType).findOne({
      attributes: ["employeeCodeMasterTypeId"],

      where: { employeeCodeMasterTypeId },
    });

    if (!existing) {
      throw new Error("Code master type not found");
    }

    await scoped(model.employeeCodeMasterType).destroy({
      where: { employeeCodeMasterTypeId },

      individualHooks: true,
    });

    return { message: "employee Code Master Type deleted successfully" };
  } catch (error) {
    console.error("Error during soft delete:", error);

    throw error;
  }
}

export async function getEmployeeCodesTypesForStudentImport() {
  try {
    const categories = await model.employeeCodeMaster.findAll({
      attributes: ["employeeCodeMasterId", "codeMasterType"],

      order: [
        ["codeMasterType", "ASC"],
        ["employeeCodeMasterId", "ASC"],
      ],
    });

    const dedupedCategories = dedupeCategoriesByType(categories);

    if (!dedupedCategories.length) {
      return [];
    }

    const categoryIds = dedupedCategories.map((cat) => {
      const plain = cat.get ? cat.get({ plain: true }) : cat;

      return plain.employeeCodeMasterId;
    });

    const codeTypes = await scoped(model.employeeCodeMasterType).findAll({
      attributes: ["employeeCodeMasterTypeId", "code", "employeeCodeMasterId"],

      where: { employeeCodeMasterId: categoryIds },

      order: [
        ["employeeCodeMasterId", "ASC"],
        ["code", "ASC"],
      ],
    });

    return groupScopedTypesByCategory(dedupedCategories, codeTypes);
  } catch (error) {
    console.error(
      "Error in getting employee code and types in bul import :",
      error,
    );

    throw error;
  }
}
