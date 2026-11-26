import * as model from "../models/index.js";

export async function createEventLog(payload, options = {}) {
  const record = await model.eventLogModel.create(
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

export async function findLogsByEventId(eventId, options = {}) {
  return await model.eventLogModel.findAll({
    where: { eventId },
    include: [
      {
        model: model.eventModel,
        as: "event",
        include: [
          {
            model: model.userModel,
            as: "user",
            attributes: ["userId", "userName", "email"],
            required: false,
          },
        ],
      },
    ],
    order: [["eventLogId", "ASC"]],
    transaction: options.transaction,
  });
}
