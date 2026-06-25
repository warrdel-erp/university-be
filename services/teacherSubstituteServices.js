import sequelize from "../database/sequelizeConfig.js";
import * as teacherSubstituteRepository from "../repository/teacherSubstituteRepository.js";

async function resolveSubstituteEmployee(substituteEmployeeId, userId, transaction) {
    const substituteEmployee = await teacherSubstituteRepository.findEmployeeInScope(
        substituteEmployeeId,
        transaction,
    );
    if (!substituteEmployee) {
        throw new Error("Substitute employee not found");
    }

    const resolvedUserId = userId ?? substituteEmployee.userId;
    if (Number(resolvedUserId) !== Number(substituteEmployee.userId)) {
        throw new Error("userId does not match substitute employee");
    }

    return {
        substituteEmployeeId,
        userId: resolvedUserId,
    };
}

export async function addTeacherSubstitute(data, createdBy, updatedBy) {
    return sequelize.transaction(async (transaction) => {
        const { employeeId, substituteEmployeeId, userId } = data;

        const teacherEmployee = await teacherSubstituteRepository.findEmployeeInScope(
            employeeId,
            transaction,
        );
        if (!teacherEmployee) {
            throw new Error("Teacher employee not found");
        }

        if (Number(employeeId) === Number(substituteEmployeeId)) {
            throw new Error("Teacher and substitute cannot be the same employee");
        }

        const substitute = await resolveSubstituteEmployee(
            substituteEmployeeId,
            userId,
            transaction,
        );

        return teacherSubstituteRepository.createTeacherSubstitute({
            employeeId,
            substituteEmployeeId: substitute.substituteEmployeeId,
            userId: substitute.userId,
            createdBy,
            updatedBy,
        }, { transaction });
    });
}

export async function getTeacherSubstitutes(employeeId) {
    return sequelize.transaction((transaction) => {
        const where = employeeId ? { employeeId: Number(employeeId) } : {};
        return teacherSubstituteRepository.getTeacherSubstitutes(where, { transaction });
    });
}

export async function getTeacherSubstituteById(teacherSubstituteId) {
    return sequelize.transaction((transaction) =>
        teacherSubstituteRepository.getTeacherSubstituteById(teacherSubstituteId, { transaction }),
    );
}

export async function updateTeacherSubstitute(teacherSubstituteId, data, updatedBy) {
    return sequelize.transaction(async (transaction) => {
        const {
            teacherSubstituteId: _id,
            employeeId: _employeeId,
            universityId: _universityId,
            instituteId: _instituteId,
            substituteEmployeeId,
            userId,
            ...rest
        } = data;

        if (Object.keys(rest).length > 0) {
            throw new Error("Only substituteEmployeeId and userId can be updated");
        }

        const updateData = { updatedBy };

        if (substituteEmployeeId != null) {
            const substitute = await resolveSubstituteEmployee(
                substituteEmployeeId,
                userId,
                transaction,
            );
            updateData.substituteEmployeeId = substitute.substituteEmployeeId;
            updateData.userId = substitute.userId;
        } else if (userId != null) {
            throw new Error("substituteEmployeeId is required when updating userId");
        }

        if (Object.keys(updateData).length === 1) {
            throw new Error("No valid fields to update");
        }

        const existing = await teacherSubstituteRepository.getTeacherSubstituteById(
            teacherSubstituteId,
            { transaction },
        );
        if (!existing) {
            return null;
        }

        if (
            updateData.substituteEmployeeId != null
            && Number(existing.employeeId) === Number(updateData.substituteEmployeeId)
        ) {
            throw new Error("Teacher and substitute cannot be the same employee");
        }

        await teacherSubstituteRepository.updateTeacherSubstitute(
            teacherSubstituteId,
            updateData,
            { transaction },
        );

        return teacherSubstituteRepository.getTeacherSubstituteById(teacherSubstituteId, { transaction });
    });
}

export async function deleteTeacherSubstitute(teacherSubstituteId) {
    return sequelize.transaction((transaction) =>
        teacherSubstituteRepository.deleteTeacherSubstitute(teacherSubstituteId, { transaction }),
    );
}
