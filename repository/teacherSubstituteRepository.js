import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

const excludeMeta = ["createdAt", "updatedAt", "createdBy", "updatedBy"];

const employeeInclude = (as) => ({
    model: model.employeeModel,
    as,
    attributes: ["userId", "employeeName", "employeeCode", "userId"],
    required: false,
    where: buildScope(model.employeeModel),
});

export async function findEmployeeInScope(userId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { userId },
        attributes: ["userId", "universityId"],
        transaction,
    });
}

export async function createTeacherSubstitute(data, options = {}) {
    return scoped(model.teacherSubstituteModel).create(data, options);
}

export async function getTeacherSubstitutes(where = {}, options = {}) {
    return scoped(model.teacherSubstituteModel).findAll({
        attributes: { exclude: excludeMeta },
        where,
        include: [
            employeeInclude("employee"),
            employeeInclude("substituteEmployee"),
        ],
        order: [["createdAt", "DESC"]],
        ...options,
    });
}

export async function getTeacherSubstituteById(teacherSubstituteId, options = {}) {
    return scoped(model.teacherSubstituteModel).findOne({
        attributes: { exclude: excludeMeta },
        where: { teacherSubstituteId },
        include: [
            employeeInclude("employee"),
            employeeInclude("substituteEmployee"),
        ],
        ...options,
    });
}

export async function updateTeacherSubstitute(teacherSubstituteId, data, options = {}) {
    const existing = await scoped(model.teacherSubstituteModel).findOne({
        where: { teacherSubstituteId },
        attributes: ["teacherSubstituteId"],
        ...options,
    });
    if (!existing) {
        return false;
    }

    await scoped(model.teacherSubstituteModel).update(data, {
        where: { teacherSubstituteId },
        ...options,
    });
    return true;
}

export async function deleteTeacherSubstitute(teacherSubstituteId, options = {}) {
    const existing = await scoped(model.teacherSubstituteModel).findOne({
        where: { teacherSubstituteId },
        attributes: ["teacherSubstituteId"],
        ...options,
    });
    if (!existing) {
        return false;
    }

    const deleted = await scoped(model.teacherSubstituteModel).destroy({
        where: { teacherSubstituteId },
        ...options,
    });
    return deleted > 0;
}
