import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { decimalAdd, decimalDivide, toMoneyNumber } from "../utility/decimalMoney.js";

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

export async function getFaculityLoadDetails() {
  try {
    return scoped(model.faculityLoadModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      include: [
        {
          model: model.employeeModel, as: "employee",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
          required: true,
          include: [
            {
              model: model.userModel, as: "user",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "password"] },
            }
          ]
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
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where: { employeeId: employee.employeeId },
      include: [
        {
          model: model.employeeModel, as: "employee",
          attributes: ["employeeId", "userId"],
        }
      ]
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
          model: model.employeeModel, as: "employee",
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
          model: model.employeeModel, as: "employee",
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
 * Recompute current_load in hours: SUM(structure.period_length minutes) / 60
 * for all week-template cell teacher rows for this userId.
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

  const teacherRows = await model.timeTableCellTeachersModel.findAll({
    attributes: ["timeTableCellTeacherId"],
    where: { userId: userIdNum },
    include: [
      {
        model: model.timeTableCellModel,
        as: "timeTableCell",
        required: true,
        attributes: ["timeTableCellId"],
        include: [
          {
            model: model.timeTableStructurePeriodsModel,
            as: "timeTablecreation",
            required: true,
            attributes: ["timeTableCreationId"],
            include: [
              {
                model: model.timeTableStructureModel,
                as: "timeTableName",
                required: true,
                attributes: ["periodLength"],
                where: buildScope(model.timeTableStructureModel),
              },
            ],
          },
        ],
      },
    ],
    transaction,
  });

  let totalMinutes = 0;
  for (const row of teacherRows) {
    const plain = row.get({ plain: true });
    const periodLength = plain.timeTableCell.timeTablecreation.timeTableName.periodLength;
    totalMinutes = decimalAdd(totalMinutes, toMoneyNumber(periodLength));
  }

  const hours = decimalDivide(totalMinutes, 60);

  return scoped(model.faculityLoadModel).update(
    { currentLoad: hours },
    {
      where: { employeeId: employee.employeeId },
      transaction,
    },
  );
}
