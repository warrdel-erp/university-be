import * as model from "../models/index.js";
import sequelize from "../database/sequelizeConfig.js";
import { buildScope, scoped } from "../utility/scoped.js";

function excludeAuditFields() {
  return ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"];
}

function campusFloorInclude() {
  return {
    model: model.campusModel,
    as: "campusFloor",
    attributes: { exclude: excludeAuditFields() },
  };
}

function instituteFloorInclude(businessWhere = {}) {
  return {
    model: model.instituteModel,
    as: "instituteFloor",
    attributes: { exclude: excludeAuditFields() },
    where: { ...businessWhere, ...buildScope(model.instituteModel) },
  };
}

function scopedFloorJoin(as = "floor", required = true) {
  return {
    model: model.libraryFloorModel,
    as,
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    where: buildScope(model.libraryFloorModel),
    required,
  };
}

function aisleStructureInclude() {
  return {
    model: model.libraryAisleModel,
    as: "aisles",
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    required: false,
    include: [
      {
        model: model.libraryRackModel,
        as: "racks",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        required: false,
        include: [
          {
            model: model.libraryRowModel,
            as: "rows",
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            required: false,
          },
        ],
      },
    ],
  };
}

async function assertScopedFloor(libraryFloorId, transaction) {
  return scoped(model.libraryFloorModel).findOne({
    where: { libraryFloorId },
    attributes: ["libraryFloorId", "libraryCreationId", "campusId", "instituteId", "universityId"],
    transaction,
  });
}

async function assertScopedAisle(libraryAisleId, transaction) {
  return scoped(model.libraryAisleModel).findOne({
    where: { libraryAisleId },
    attributes: ["libraryAisleId", "libraryFloorId"],
    include: [scopedFloorJoin()],
    transaction,
  });
}

async function assertScopedRack(libraryRackId, transaction) {
  return scoped(model.libraryRackModel).findOne({
    where: { libraryRackId },
    attributes: ["libraryRackId", "libraryAisleId"],
    include: [
      {
        model: model.libraryAisleModel,
        as: "aisle",
        attributes: ["libraryAisleId"],
        required: true,
        include: [scopedFloorJoin()],
      },
    ],
    transaction,
  });
}

async function assertScopedRow(libraryRowId, transaction) {
  return scoped(model.libraryRowModel).findOne({
    where: { libraryRowId },
    attributes: ["libraryRowId", "libraryRackId"],
    include: [
      {
        model: model.libraryRackModel,
        as: "rack",
        attributes: ["libraryRackId"],
        required: true,
        include: [
          {
            model: model.libraryAisleModel,
            as: "aisle",
            attributes: ["libraryAisleId"],
            required: true,
            include: [scopedFloorJoin()],
          },
        ],
      },
    ],
    transaction,
  });
}

export async function createLibrary(payload, transaction) {
  try {
    return await scoped(model.libraryCreationModel).create(payload, { transaction });
  } catch (error) {
    console.error("Repository createLibrary error:", error);
    throw error;
  }
}

export async function createFloor(payload, transaction) {
  try {
    return await scoped(model.libraryFloorModel).create(payload, { transaction });
  } catch (error) {
    console.error("Repository createFloor error:", error);
    throw error;
  }
}

export async function addFloor(payload) {
  return scoped(model.libraryFloorModel).create(payload);
}

export async function getFloorDetails() {
  try {
    return await scoped(model.libraryFloorModel).findAll({
      attributes: { exclude: excludeAuditFields() },
      include: [campusFloorInclude(), instituteFloorInclude()],
    });
  } catch (error) {
    console.error("Error fetching Floor details:", error);
    throw error;
  }
}

export async function getSingleFloorDetails(libraryFloorId) {
  try {
    return await scoped(model.libraryFloorModel).findOne({
      attributes: { exclude: excludeAuditFields() },
      where: { libraryFloorId },
      include: [
        campusFloorInclude(),
        instituteFloorInclude(),
        aisleStructureInclude(),
      ],
    });
  } catch (error) {
    console.error("Error fetching Floor details:", error);
    throw error;
  }
}

export async function updateFloor(libraryFloorId, floorData) {
  try {
    const existing = await assertScopedFloor(libraryFloorId);
    if (!existing) {
      return [0];
    }

    return await scoped(model.libraryFloorModel).update(floorData, {
      where: { libraryFloorId },
    });
  } catch (error) {
    console.error(`Error updating Floor creation ${libraryFloorId}:`, error);
    throw error;
  }
}

export async function deleteFloor(libraryFloorId) {
  const existing = await assertScopedFloor(libraryFloorId);
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.libraryFloorModel).destroy({ where: { libraryFloorId } });
  return deleted > 0;
}

export async function findFloorById(libraryFloorId, transaction) {
  return assertScopedFloor(libraryFloorId, transaction);
}

export async function findFloorStructureById(libraryFloorId) {
  return scoped(model.libraryFloorModel).findOne({
    attributes: ["libraryFloorId", "libraryCreationId", "name", "description"],
    where: { libraryFloorId },
    include: [
      {
        model: model.libraryAisleModel,
        as: "aisles",
        attributes: ["libraryAisleId", "libraryFloorId", "name", "description"],
        required: false,
        include: [
          {
            model: model.libraryRackModel,
            as: "racks",
            attributes: ["libraryRackId", "libraryAisleId", "name", "description"],
            required: false,
            include: [
              {
                model: model.libraryRowModel,
                as: "rows",
                attributes: ["libraryRowId", "libraryRackId", "name", "description"],
                required: false,
              },
            ],
          },
        ],
      },
    ],
  });
}

export async function getMaxNumericAisleNameByFloorId(libraryFloorId, transaction) {
  const floor = await assertScopedFloor(libraryFloorId, transaction);
  if (!floor) {
    return 0;
  }

  const row = await scoped(model.libraryAisleModel).findOne({
    attributes: [[sequelize.literal("MAX(CAST(`name` AS UNSIGNED))"), "maxName"]],
    where: { libraryFloorId },
    transaction,
    raw: true,
  });
  const maxName = Number(row?.maxName);
  return Number.isNaN(maxName) ? 0 : maxName;
}

export async function bulkCreateAisles(rows, transaction) {
  if (!rows.length) return [];
  const floor = await assertScopedFloor(rows[0].libraryFloorId, transaction);
  if (!floor) {
    throw new Error("Library floor not found");
  }
  return model.libraryAisleModel.bulkCreate(rows, { transaction });
}

export async function bulkCreateRacks(rows, transaction) {
  if (!rows.length) return [];
  for (const aisleId of [...new Set(rows.map((row) => row.libraryAisleId))]) {
    const aisle = await assertScopedAisle(aisleId, transaction);
    if (!aisle) {
      throw new Error("Library aisle not found");
    }
  }
  return model.libraryRackModel.bulkCreate(rows, { transaction });
}

export async function bulkCreateRows(rows, transaction) {
  if (!rows.length) return [];
  for (const rackId of [...new Set(rows.map((row) => row.libraryRackId))]) {
    const rack = await assertScopedRack(rackId, transaction);
    if (!rack) {
      throw new Error("Library rack not found");
    }
  }
  return model.libraryRowModel.bulkCreate(rows, { transaction });
}

export async function addAisle(data) {
  const scopedFloor = await assertScopedFloor(data.libraryFloorId);
  if (!scopedFloor) {
    throw new Error("Library floor not found");
  }
  return scoped(model.libraryAisleModel).create(data);
}

export async function getAisleDetails() {
  return scoped(model.libraryAisleModel).findAll({
    attributes: { exclude: excludeAuditFields() },
    include: [scopedFloorJoin()],
  });
}

export async function getSingleAisle(libraryAisleId) {
  return scoped(model.libraryAisleModel).findOne({
    where: { libraryAisleId },
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    include: [scopedFloorJoin()],
  });
}

export async function updateAisle(libraryAisleId, data) {
  const existing = await assertScopedAisle(libraryAisleId);
  if (!existing) {
    return [0];
  }
  return scoped(model.libraryAisleModel).update(data, { where: { libraryAisleId } });
}

export async function deleteAisle(libraryAisleId) {
  const existing = await assertScopedAisle(libraryAisleId);
  if (!existing) {
    return 0;
  }
  return scoped(model.libraryAisleModel).destroy({ where: { libraryAisleId } });
}

export async function addRack(data) {
  const aisle = await assertScopedAisle(data.libraryAisleId);
  if (!aisle) {
    throw new Error("Library aisle not found");
  }
  return scoped(model.libraryRackModel).create(data);
}

export async function getRackDetails() {
  return scoped(model.libraryRackModel).findAll({
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    include: [
      {
        model: model.libraryAisleModel,
        as: "aisle",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        required: true,
        include: [scopedFloorJoin()],
      },
    ],
  });
}

export async function getSingleRack(libraryRackId) {
  return scoped(model.libraryRackModel).findOne({
    where: { libraryRackId },
    include: [
      {
        model: model.libraryAisleModel,
        as: "aisle",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        required: true,
        include: [scopedFloorJoin()],
      },
    ],
  });
}

export async function updateRack(libraryRackId, data) {
  const existing = await assertScopedRack(libraryRackId);
  if (!existing) {
    return [0];
  }
  return scoped(model.libraryRackModel).update(data, { where: { libraryRackId } });
}

export async function deleteRack(libraryRackId) {
  const existing = await assertScopedRack(libraryRackId);
  if (!existing) {
    return 0;
  }
  return scoped(model.libraryRackModel).destroy({ where: { libraryRackId } });
}

export async function addRow(data) {
  const rack = await assertScopedRack(data.libraryRackId);
  if (!rack) {
    throw new Error("Library rack not found");
  }
  return scoped(model.libraryRowModel).create(data);
}

export async function getRowDetails() {
  return scoped(model.libraryRowModel).findAll({
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    include: [
      {
        model: model.libraryRackModel,
        as: "rack",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        required: true,
        include: [
          {
            model: model.libraryAisleModel,
            as: "aisle",
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            required: true,
            include: [scopedFloorJoin()],
          },
        ],
      },
    ],
  });
}

export async function getSingleRow(libraryRowId) {
  return scoped(model.libraryRowModel).findOne({
    where: { libraryRowId },
    include: [
      {
        model: model.libraryRackModel,
        as: "rack",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        required: true,
        include: [
          {
            model: model.libraryAisleModel,
            as: "aisle",
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            required: true,
            include: [scopedFloorJoin()],
          },
        ],
      },
    ],
  });
}

export async function updateRow(libraryRowId, data) {
  const existing = await assertScopedRow(libraryRowId);
  if (!existing) {
    return [0];
  }
  return scoped(model.libraryRowModel).update(data, { where: { libraryRowId } });
}

export async function deleteRow(libraryRowId) {
  const existing = await assertScopedRow(libraryRowId);
  if (!existing) {
    return 0;
  }
  return scoped(model.libraryRowModel).destroy({ where: { libraryRowId } });
}

export async function getAisleIdByName(name) {
  try {
    const aisle = await scoped(model.libraryAisleModel).findOne({
      where: { name },
      include: [scopedFloorJoin()],
    });

    if (!aisle) throw new Error(`Aisle not found: ${name}`);

    return aisle.libraryAisleId;
  } catch (error) {
    console.error("Error finding aisle:", error);
    throw new Error(error.message);
  }
}

export async function getRackIdByName(name) {
  try {
    const rack = await scoped(model.libraryRackModel).findOne({
      where: { name },
      include: [
        {
          model: model.libraryAisleModel,
          as: "aisle",
          required: true,
          include: [scopedFloorJoin()],
        },
      ],
    });

    if (!rack) throw new Error(`Rack not found: ${name}`);

    return rack.libraryRackId;
  } catch (error) {
    console.error("Error finding rack:", error);
    throw new Error(error.message);
  }
}

export async function getRowIdByName(name) {
  try {
    const row = await scoped(model.libraryRowModel).findOne({
      where: { name },
      include: [
        {
          model: model.libraryRackModel,
          as: "rack",
          required: true,
          include: [
            {
              model: model.libraryAisleModel,
              as: "aisle",
              required: true,
              include: [scopedFloorJoin()],
            },
          ],
        },
      ],
    });

    if (!row) throw new Error(`Row not found: ${name}`);

    return row.libraryRowId;
  } catch (error) {
    console.error("Error finding row:", error);
    throw new Error(error.message);
  }
}
