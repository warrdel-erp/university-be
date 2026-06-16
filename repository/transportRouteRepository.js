import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function createTransportRoute(data) {
  try {
    return scoped(model.transportRouteModel).create(data);
  } catch (error) {
    console.error("Error in createTransportRoute:", error);
    throw error;
  }
}

export async function findAllTransportRoutes() {
  try {
    return scoped(model.transportRouteModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      include: [
        {
          model: model.userModel.unscoped(),
          as: "transportUser",
          attributes: ["universityId", "userId"],
          where: buildScope(model.userModel),
          required: true,
        },
      ],
    });
  } catch (error) {
    console.error("Error in findAllTransportRoutes:", error);
    throw error;
  }
}

export async function findTransportRouteById(transportRouteId) {
  try {
    return scoped(model.transportRouteModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: { transportRouteId },
      include: [
        {
          model: model.userModel.unscoped(),
          as: "transportUser",
          attributes: ["universityId", "userId"],
          where: buildScope(model.userModel),
          required: true,
        },
      ],
    });
  } catch (error) {
    console.error(`Error in findTransportRouteById for ID ${transportRouteId}:`, error);
    throw error;
  }
}

export async function updateTransportRouteById(id, data) {
  try {
    const existing = await scoped(model.transportRouteModel).findOne({
      attributes: ["transportRouteId"],
      where: { transportRouteId: id },
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.transportRouteModel).update(data, {
      where: { transportRouteId: id },
    });
  } catch (error) {
    console.error(`Error in updateTransportRouteById for ID ${id}:`, error);
    throw error;
  }
}

export async function deleteTransportRouteById(id) {
  try {
    const existing = await scoped(model.transportRouteModel).findOne({
      attributes: ["transportRouteId"],
      where: { transportRouteId: id },
    });
    if (!existing) {
      return 0;
    }

    return scoped(model.transportRouteModel).destroy({
      where: { transportRouteId: id },
    });
  } catch (error) {
    console.error(`Error in deleteTransportRouteById for ID ${id}:`, error);
    throw error;
  }
}
