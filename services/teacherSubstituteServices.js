import sequelize from "../database/sequelizeConfig.js";
import * as teacherSubstituteRepository from "../repository/teacherSubstituteRepository.js";

async function resolveSubstituteEmployee(substituteUserId, universityId, transaction) {
    const substituteEmployee = await teacherSubstituteRepository.findEmployeeInScope(
        substituteUserId,
        transaction,
    );
    if (!substituteEmployee) {
        throw new Error("Substitute employee not found");
    }

    const resolvedUniversityId = universityId ?? substituteEmployee.universityId;
    if (Number(resolvedUniversityId) !== Number(substituteEmployee.universityId)) {
        throw new Error("universityId does not match substitute employee");
    }

    return {
        substituteUserId,
        universityId: resolvedUniversityId,
    };
}

export async function addTeacherSubstitute(data, createdBy, updatedBy) {
    return sequelize.transaction(async (transaction) => {
        const { userId, substituteUserId, universityId } = data;

        const teacherEmployee = await teacherSubstituteRepository.findEmployeeInScope(
            userId,
            transaction,
        );
        if (!teacherEmployee) {
            throw new Error("Teacher employee not found");
        }

        if (Number(userId) === Number(substituteUserId)) {
            throw new Error("Teacher and substitute cannot be the same employee");
        }

        const substitute = await resolveSubstituteEmployee(
            substituteUserId,
            universityId,
            transaction,
        );

        return teacherSubstituteRepository.createTeacherSubstitute({
            userId,
            substituteUserId: substitute.substituteUserId,
            universityId: substitute.universityId,
            createdBy,
            updatedBy,
        }, { transaction });
    });
}

export async function getTeacherSubstitutes(userId) {
    return sequelize.transaction((transaction) => {
        const where = userId ? { userId: Number(userId) } : {};
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
            userId: _userId,
            universityId: _universityId,
            instituteId: _instituteId,
            substituteUserId,
            userId,
            ...rest
        } = data;

        if (Object.keys(rest).length > 0) {
            throw new Error("Only substituteUserId and userId can be updated");
        }

        const updateData = { updatedBy };

        if (substituteUserId != null) {
            const substitute = await resolveSubstituteEmployee(
                substituteUserId,
                userId,
                transaction,
            );
            updateData.substituteUserId = substitute.substituteUserId;
            updateData.userId = substitute.userId;
        } else if (userId != null) {
            throw new Error("substituteUserId is required when updating userId");
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
            updateData.substituteUserId != null
            && Number(existing.userId) === Number(updateData.substituteUserId)
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
