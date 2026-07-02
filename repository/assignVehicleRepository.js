import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

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

export async function getAssignVehicle() {
  try {
    return scoped(model.assignVehicleModel).findAll({
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
      },
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
