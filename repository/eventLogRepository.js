import eventLogModel from "../models/eventLogModel.js";

export async function createEventLog(payload, options = {}) {
  const record = await eventLogModel.create(
    {
      eventId: payload.eventId,
      universityId: payload.universityId ?? null,
      instituteId: payload.instituteId ?? null,
      academicYearId: payload.academicYearId ?? null,
      entity: payload.entity,
      entityId: payload.entityId ?? null,
      action: payload.action,
      oldData: payload.oldData ?? null,
      newData: payload.newData ?? null,
    },
    { transaction: options.transaction },
  );
  return record.get({ plain: true });
}
