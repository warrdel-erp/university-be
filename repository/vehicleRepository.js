import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { Op } from "sequelize";

export async function createVehicle(vehicleData) {
  const employee = await scoped(model.employeeModel).findOne({
    attributes: ["userId"],
    where: { userId: vehicleData.userId },
  });
  if (!employee) {
    throw new Error("Employee not found");
  }

  return scoped(model.vehicleModel).create(vehicleData);
}

export async function getAllVehicles(page, limit, search) {
  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      where[Op.or] = [
        { vehicleNumber: { [Op.like]: searchTerm } },
        { vehicleModel: { [Op.like]: searchTerm } },
        { "$employee.employee_name$": { [Op.like]: searchTerm } }
      ];
    }

    const { count, rows } = await scoped(model.vehicleModel).findAndCountAll({
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
      },
      where,
      include: [
        {
          model: model.employeeModel,
          as: "employee",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.employeeModel),
          required: true,
        },
      ],
      limit: limitNum,
      offset,
      subQuery: false,
      order: [["vehicleId", "DESC"]],
    });

    return {
      rows,
      total: count,
      page: pageNum,
      limit: limitNum,
    };
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    throw error;
  }
}

export async function getVehicleById(vehicleId) {
  return scoped(model.vehicleModel).findOne({
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
    where: { vehicleId },
    include: [
      {
        model: model.employeeModel,
        as: "employee",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        where: buildScope(model.employeeModel),
        required: true,
      },
    ],
  });
}

export async function updateVehicle(vehicleId, vehicleData) {
  const existing = await scoped(model.vehicleModel).findOne({
    attributes: ["vehicleId"],
    where: { vehicleId },
  });
  if (!existing) {
    return [0];
  }

  return scoped(model.vehicleModel).update(vehicleData, {
    where: { vehicleId },
  });
}

export async function deleteVehicle(vehicleId) {
  const existing = await scoped(model.vehicleModel).findOne({
    attributes: ["vehicleId"],
    where: { vehicleId },
  });
  if (!existing) {
    return 0;
  }

  return scoped(model.vehicleModel).destroy({
    where: { vehicleId },
  });
}
