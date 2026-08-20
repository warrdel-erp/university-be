import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { Op } from "sequelize";

export async function addAssignVehicle(assignVehicleData) {
  const route = await scoped(model.transportRouteModel).findOne({
    attributes: ["transportRouteId"],
    where: { transportRouteId: assignVehicleData.transportRouteId },
  });
  if (!route) {
    throw new Error("Transport route not found");
  }

  const vehicle = await scoped(model.vehicleModel).findOne({
    attributes: ["vehicleId"],
    where: { vehicleId: assignVehicleData.vehicleId },
  });
  if (!vehicle) {
    throw new Error("Vehicle not found");
  }

  return scoped(model.assignVehicleModel).create(assignVehicleData);
}

export async function getAssignVehicle(page, limit, search) {
  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      where[Op.or] = [
        { "$transportRoute.route_title$": { [Op.like]: searchTerm } },
        { "$vehicle.vehicle_number$": { [Op.like]: searchTerm } },
        { "$vehicle.vehicle_model$": { [Op.like]: searchTerm } }
      ];
    }

    const { count, rows } = await scoped(model.assignVehicleModel).findAndCountAll({
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
      },
      where,
      include: [
        {
          model: model.transportRouteModel,
          as: "transportRoute",
          attributes: ["routeTitle", "fare", "academicYearId", "instituteId"],
          where: buildScope(model.transportRouteModel),
          required: true,
        },
        {
          model: model.vehicleModel,
          as: "vehicle",
          attributes: ["vehicleNumber", "vehicleModel", "instituteId"],
          where: buildScope(model.vehicleModel),
          required: true,
        },
        {
          model: model.userModel,
          as: "assignVehicleUser",
          attributes: ["universityId", "userId"],
          where: buildScope(model.userModel),
          required: true,
        },
      ],
      limit: limitNum,
      offset,
      subQuery: false,
      order: [["assignVehicleId", "DESC"]],
    });

    return {
      rows,
      total: count,
      page: pageNum,
      limit: limitNum,
    };
  } catch (error) {
    console.error("Error in getAssignVehicle:", error);
    throw error;
  }
}

export async function getSingleAssignVehicle(assignVehicleId) {
  return scoped(model.assignVehicleModel).findOne({
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
    where: { assignVehicleId },
    include: [
      {
        model: model.transportRouteModel,
        as: "transportRoute",
        attributes: ["routeTitle", "fare", "academicYearId", "instituteId"],
        where: buildScope(model.transportRouteModel),
        required: true,
      },
      {
        model: model.vehicleModel,
        as: "vehicle",
        attributes: ["vehicleNumber", "vehicleModel", "instituteId"],
        where: buildScope(model.vehicleModel),
        required: true,
      },
      {
        model: model.userModel,
        as: "assignVehicleUser",
        attributes: ["universityId", "userId"],
        where: buildScope(model.userModel),
        required: true,
      },
    ],
  });
}

export async function updateAssignVehicle(assignVehicleId, vehicleData) {
  const existing = await getSingleAssignVehicle(assignVehicleId);
  if (!existing) {
    return [0];
  }

  if (vehicleData.transportRouteId) {
    const route = await scoped(model.transportRouteModel).findOne({
      attributes: ["transportRouteId"],
      where: { transportRouteId: vehicleData.transportRouteId },
    });
    if (!route) {
      return [0];
    }
  }

  if (vehicleData.vehicleId) {
    const vehicle = await scoped(model.vehicleModel).findOne({
      attributes: ["vehicleId"],
      where: { vehicleId: vehicleData.vehicleId },
    });
    if (!vehicle) {
      return [0];
    }
  }

  return scoped(model.assignVehicleModel).update(vehicleData, {
    where: { assignVehicleId },
  });
}

export async function deleteAssignVehicle(assignVehicleId) {
  const existing = await getSingleAssignVehicle(assignVehicleId);
  if (!existing) {
    return 0;
  }

  return scoped(model.assignVehicleModel).destroy({
    where: { assignVehicleId },
  });
}
