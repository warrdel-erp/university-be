import * as campusRepository from "../repository/campusRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

function flattenCampusInput(item) {
  return {
    campusName: item.campusName,
    campusCode: item.campusCode,
    campusType: item.campusType,
    addressLine: item.address?.addressLine ?? null,
    latitude: item.address?.geoTag?.latitude ?? null,
    longitude: item.address?.geoTag?.longitude ?? null,
    administratorName: item.campusAdministrator?.name ?? null,
    administratorContactNumber: item.campusAdministrator?.contactNumber ?? null,
    administratorEmail: item.campusAdministrator?.email ?? null,
  };
}

function flattenCampusUpdateInput(item) {
  const data = {};
  if (item.campusName !== undefined) data.campusName = item.campusName;
  if (item.campusCode !== undefined) data.campusCode = item.campusCode;
  if (item.campusType !== undefined) data.campusType = item.campusType;
  if (item.address?.addressLine !== undefined) data.addressLine = item.address.addressLine;
  if (item.address?.geoTag !== undefined) {
    data.latitude = item.address.geoTag?.latitude ?? null;
    data.longitude = item.address.geoTag?.longitude ?? null;
  }
  if (item.campusAdministrator?.name !== undefined) {
    data.administratorName = item.campusAdministrator.name;
  }
  if (item.campusAdministrator?.contactNumber !== undefined) {
    data.administratorContactNumber = item.campusAdministrator.contactNumber;
  }
  if (item.campusAdministrator?.email !== undefined) {
    data.administratorEmail = item.campusAdministrator.email;
  }
  return data;
}

export function mapCampusRow(row) {
  const plain = row.get ? row.get({ plain: true }) : row;

  return {
    campusId: plain.campusId,
    campusName: plain.campusName,
    campusCode: plain.campusCode,
    campusType: plain.campusType,
    address: {
      addressLine: plain.addressLine,
      geoTag:
        plain.latitude != null && plain.longitude != null
          ? { latitude: plain.latitude, longitude: plain.longitude }
          : null,
    },
    campusAdministrator: {
      name: plain.administratorName,
      contactNumber: plain.administratorContactNumber,
      email: plain.administratorEmail,
    },
  };
}

export async function createCampus(campus, createdBy) {
  try {
    return await withAuditEvent(AUDIT_EVENTS.CAMPUS_CREATE, async ({ transaction }) => {
      const payload = flattenCampusInput(campus);
      const row = await campusRepository.createCampus(payload, createdBy, { transaction });
      return mapCampusRow(row);
    });
  } catch (error) {
    console.error("Error in Campus Service (createCampus):", error);
    throw error;
  }
}

export async function updateCampus(campusId, body) {
  try {
    return await withAuditEvent(AUDIT_EVENTS.CAMPUS_UPDATE, async ({ transaction }) => {
      const data = flattenCampusUpdateInput(body);
      const row = await campusRepository.updateCampus(campusId, data, { transaction });
      if (!row) {
        const error = new Error("Campus not found");
        error.statusCode = 404;
        throw error;
      }
      return mapCampusRow(row);
    });
  } catch (error) {
    console.error("Error in Campus Service (updateCampus):", error);
    throw error;
  }
}

export async function listCampuses() {
  try {
    const rows = await campusRepository.getCampuses();
    return rows.map(mapCampusRow);
  } catch (error) {
    console.error("Error in Campus Service (listCampuses):", error);
    throw error;
  }
}

export async function getCampusHierarchy(universityId) {
  try {
    return campusRepository.getCampusHierarchy(universityId);
  } catch (error) {
    console.error("Error in Campus Service (getCampusHierarchy):", error);
    throw error;
  }
}
