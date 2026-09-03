import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { decimalAdd, toIntegerNumber } from "../utility/decimalMoney.js";

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
 * currentLoad: +1 for each published date-wise class the teacher is on.
 * Source: timeTableCellDateWise -> timeTableCellTeachersDateWise
 */
export async function countPublishedDateWiseClassesByUserIds(userIds, transaction) {
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

  const counts = new Map();
  for (const id of ids) {
    counts.set(id, 0);
  }

  if (ids.length === 0) {
    return counts;
  }

  const rows = await model.timeTableCellDateWiseModel.findAll({
    attributes: ["timeTableCellDateWiseId"],
    include: [
      {
        model: model.timeTableCellTeachersDateWiseModel,
        as: "timeTableCellTeachersDateWise",
        required: true,
        attributes: ["userId"],
        where: { userId: { [Op.in]: ids } },
      },
      {
        model: model.timeTableCellModel,
        as: "timeTableCell",
        required: true,
        attributes: [],
        include: [
          {
            model: model.timeTableRoutineModel,
            as: "timeTableRoutine",
            required: true,
            attributes: [],
            where: {
              isPublish: true,
              ...buildScope(model.timeTableRoutineModel),
            },
          },
        ],
      },
    ],
    transaction,
  });

  for (const row of rows) {
    const plain = row.get({ plain: true });
    const teachers = plain.timeTableCellTeachersDateWise || [];
    for (const teacher of teachers) {
      const userId = Number(teacher.userId);
      if (!counts.has(userId)) {
        continue;
      }
      // One date-wise class = +1 faculty load
      counts.set(userId, toIntegerNumber(decimalAdd(counts.get(userId), 1)));
    }
  }

  return counts;
}

/**
 * Persist current_load as date-wise class count (+1 each).
 */
export async function recomputeFaculityCurrentLoadHours(userId, transaction) {
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

  const counts = await countPublishedDateWiseClassesByUserIds([userIdNum], transaction);
  const classCount = counts.get(userIdNum) || 0;

  return scoped(model.faculityLoadModel).update(
    { currentLoad: classCount },
    {
      where: { employeeId: employee.employeeId },
      transaction,
    },
  );
}
