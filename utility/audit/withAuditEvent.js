import { randomUUID } from "node:crypto";

import sequelize from "../../database/sequelizeConfig.js";
import { AUDIT_EVENTS } from "../../const/auditEvents.js";
import { requestContext } from "../requestContext.js";
import { runWithAuditContext, getCurrentEventId } from "./auditContext.js";
import {
  createEvent,
  markEventSuccess,
  markEventFailed,
} from "../../repository/eventRepository.js";

const VALID_EVENT_TYPES = new Set(Object.values(AUDIT_EVENTS));
const MAX_ERROR_MESSAGE_LENGTH = 5_000;

function safeErrorMessage(error) {
  if (!error) return null;
  const msg = error.message ? String(error.message) : String(error);
  return msg.slice(0, MAX_ERROR_MESSAGE_LENGTH) || null;
}

export async function withAuditEvent(eventType, callback) {
  if (!VALID_EVENT_TYPES.has(eventType)) {
    throw new Error(`Invalid eventType: ${eventType}`);
  }

  if (getCurrentEventId() != null) {
    throw new Error("Nested withAuditEvent calls are not supported");
  }

  const store = requestContext.getStore() ?? {};
  const { userId = null, universityId = null, instituteId = null, academicYearId = null } = store;
  const eventId = randomUUID();

  await createEvent({
    eventId,
    eventType,
    userId,
    universityId,
    instituteId,
    academicYearId,
  });

  let businessResult;
  try {
    businessResult = await runWithAuditContext(eventId, eventType, async () => {
      return await sequelize.transaction(async (transaction) => {
        return callback({ transaction });
      });
    });
  } catch (businessError) {
    try {
      await markEventFailed(eventId, safeErrorMessage(businessError));
    } catch (auditError) {
      console.error("Failed to mark event FAILED:", auditError);
    }
    throw businessError;
  }

  try {
    await markEventSuccess(eventId);
  } catch (auditError) {
    console.error("Failed to mark event SUCCESS:", auditError);
  }

  return businessResult;
}
