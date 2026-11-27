import {
  createTransportRoute,
  findAllTransportRoutes,
  findTransportRouteById,
  updateTransportRouteById,
  deleteTransportRouteById,
} from "../repository/transportRouteRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addTransportRouteService(data) {
  return withAuditEvent(AUDIT_EVENTS.TRANSPORT_ROUTE_CREATE, async ({ transaction }) => {
    return createTransportRoute(data, transaction);
  });
}

export async function getAllTransportRouteService() {
  try {
    return findAllTransportRoutes();
  } catch (error) {
    console.error("Error in getAllTransportRouteService:", error);
    throw error;
  }
}

export async function getSingleTransportRouteService(id) {
  try {
    return findTransportRouteById(id);
  } catch (error) {
    console.error(`Error in getSingleTransportRouteService for ID ${id}:`, error);
    throw error;
  }
}

export async function updateTransportRouteService(id, data) {
  return withAuditEvent(AUDIT_EVENTS.TRANSPORT_ROUTE_UPDATE, async ({ transaction }) => {
    return updateTransportRouteById(id, data, transaction);
  });
}

export async function deleteTransportRouteService(id) {
  return withAuditEvent(AUDIT_EVENTS.TRANSPORT_ROUTE_DELETE, async ({ transaction }) => {
    return deleteTransportRouteById(id, transaction);
  });
}
