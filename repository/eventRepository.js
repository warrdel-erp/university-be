import eventModel from "../models/eventModel.js";

const MAX_ERROR_MESSAGE_LENGTH = 5_000;

export async function createEvent(
  {
    eventType,
    status = "PENDING",
    userId = null,
    universityId = null,
    instituteId = null,
    academicYearId = null,
  },
  options = {},
) {
  const record = await eventModel.create(
    {
      eventType,
      status,
      userId,
      universityId,
      instituteId,
      academicYearId,
      completedAt: status === "SUCCESS" ? new Date() : null,
    },
    { transaction: options.transaction },
  );
  return record.get({ plain: true });
}

export async function markEventSuccess(eventId) {
  await eventModel.update(
    {
      status: "SUCCESS",
      completedAt: new Date(),
    },
    { where: { eventId } },
  );
}

export async function markEventFailed(eventId, errorMessage = null) {
  let safeMessage = null;
  if (errorMessage != null) {
    safeMessage = String(errorMessage).slice(0, MAX_ERROR_MESSAGE_LENGTH) || null;
  }

  await eventModel.update(
    {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: safeMessage,
    },
    { where: { eventId } },
  );
}
