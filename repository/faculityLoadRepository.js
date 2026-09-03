import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function addFaculityLoad(data) {
  try {
    const employee = await scoped(model.employeeModel).findOne({
      attributes: ["employeeId", "userId"],
      where: { userId: data.userId },
    });
    if (!employee) {
      throw new Error("Employee not found");
    }

    data.employeeId = employee.employeeId;
    delete data.userId;
    return scoped(model.faculityLoadModel).create(data);
  } catch (error) {
    console.error("Error in create faculity load:", error);
    throw error;
  }
}

export async function getFaculityLoadDetails(academicYearId) {
  try {
    const where = {};
    if (academicYearId != null && academicYearId !== "") {
      where.academicYearId = Number(academicYearId);
    }

    return scoped(model.faculityLoadModel).findAll({
      where,
      attributes: [
        "faculityLoadId",
        "employeeId",
        "definedLoad",
        "currentLoad",
        "universityId",
        "instituteId",
        "academicYearId",
      ],
      include: [
        {
          model: model.employeeModel,
          as: "employee",
          attributes: [
            "employeeId",
            "userId",
            "employeeName",
            "employeeCode",
            "departmentId",
            "employmentType",
            "pickColor",
          ],
          required: true,
        },
      ],
    });
  } catch (error) {
    console.error("Error in getting faculity load:", error);
    throw error;
  }
}

export async function getSingleFaculityLoadDetails(userId) {
  try {
    const employee = await scoped(model.employeeModel).findOne({
      attributes: ["employeeId", "userId"],
      where: { userId },
    });
    if (!employee) {
      return [];
    }

    return scoped(model.faculityLoadModel).findAll({
      attributes: [
        "faculityLoadId",
        "employeeId",
        "definedLoad",
        "currentLoad",
        "universityId",
        "instituteId",
        "academicYearId",
      ],
      where: { employeeId: employee.employeeId },
      include: [
        {
          model: model.employeeModel,
          as: "employee",
          attributes: ["employeeId", "userId", "employeeName", "employeeCode"],
        },
      ],
    });
  } catch (error) {
    console.error("Error in getting faculity load:", error);
    throw error;
  }
}

export async function updateFaculityLoad(faculityLoadId, info) {
  try {
    const existing = await scoped(model.faculityLoadModel).findOne({
      attributes: ["faculityLoadId"],
      where: { faculityLoadId },
      include: [
        {
          model: model.employeeModel,
          as: "employee",
          attributes: ["employeeId", "userId"],
          required: true,
        },
      ],
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.faculityLoadModel).update(info, {
      where: { faculityLoadId },
    });
  } catch (error) {
    console.error(`Error updating faculity load ${faculityLoadId} :`, error);
    throw error;
  }
}

export async function deleteFaculityLoad(faculityLoadId) {
  try {
    const existing = await scoped(model.faculityLoadModel).findOne({
      attributes: ["faculityLoadId"],
      where: { faculityLoadId },
      include: [
        {
          model: model.employeeModel,
          as: "employee",
          attributes: ["employeeId", "userId"],
          required: true,
        },
      ],
    });
    if (!existing) {
      throw new Error("Faculity load not found");
    }

    await scoped(model.faculityLoadModel).destroy({
      where: { faculityLoadId },
      individualHooks: true,
    });
    return { message: `faculity load deleted successfully for time Table Creation Id :-${faculityLoadId}` };
  } catch (error) {
    console.error("Error during soft delete:", error);
    throw new Error("Unable to soft delete account");
  }
}

export async function updateFaculityLoadByEmployeeId(userId, info, transaction) {
  try {
    const employee = await scoped(model.employeeModel).findOne({
      attributes: ["employeeId", "userId"],
      where: { userId },
      transaction,
    });
    if (!employee) {
      return [0];
    }

    return scoped(model.faculityLoadModel).update(info, {
      where: { employeeId: employee.employeeId },
      transaction,
    });
  } catch (error) {
    console.error(`Error updating faculity load by employee Id ${userId} :`, error);
    throw error;
  }
}

/**
 * Published date-wise classes in [startDate, endDate] for the given teacher userIds.
 * Returns period start/end times via timeTableCell -> timeTablecreation.
 * One query for all faculty (no per-faculty DB calls).
 */
export async function findPublishedWeekDateWiseTeacherPeriods(
  userIds,
  startDate,
  endDate,
  transaction,
) {
  const ids = [];
  const seen = new Set();
  for (const raw of userIds || []) {
    const id = Number(raw);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }

  if (ids.length === 0) {
    return [];
  }

  return model.timeTableCellDateWiseModel.findAll({
    attributes: ["timeTableCellDateWiseId", "date", "timeTableCellId"],
    where: {
      date: {
        [Op.between]: [startDate, endDate],
      },
    },
    include: [
      {
        model: model.timeTableCellTeachersDateWiseModel,
        as: "timeTableCellTeachersDateWise",
        required: true,
        attributes: ["timeTableCellTeachersDateWiseId", "userId", "timeTableCellDateWiseId"],
        where: { userId: { [Op.in]: ids } },
      },
      {
        model: model.timeTableCellModel,
        as: "timeTableCell",
        required: true,
        attributes: ["timeTableCellId", "timeTableCreationId"],
        include: [
          {
            model: model.timeTableRoutineModel,
            as: "timeTableRoutine",
            required: true,
            attributes: ["timeTableRoutineId", "isPublish"],
            where: {
              isPublish: true,
              ...buildScope(model.timeTableRoutineModel),
            },
          },
          {
            model: model.timeTableStructurePeriodsModel,
            as: "timeTablecreation",
            required: true,
            attributes: ["timeTableCreationId", "startTime", "endTime", "periodName"],
          },
        ],
      },
    ],
    transaction,
  });
}

/**
 * Persist current_load for a faculty from current-week date-wise teaching hours.
 * currentLoadHours must already be decimal hours (minutes / 60).
 */
export async function updateFaculityCurrentLoadByUserId(userId, currentLoadHours, transaction) {
  const userIdNum = Number(userId);
  if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
    return [0];
  }

  const employee = await scoped(model.employeeModel).findOne({
    attributes: ["employeeId", "userId"],
    where: { userId: userIdNum },
    transaction,
  });
  if (!employee) {
    return [0];
  }

  return scoped(model.faculityLoadModel).update(
    { currentLoad: currentLoadHours },
    {
      where: { employeeId: employee.employeeId },
      transaction,
    },
  );
}
