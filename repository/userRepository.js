import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { requestContext } from "../utility/requestContext.js";

export async function register(data) {
  return model.userModel.unscoped().create(data);
}

export async function adminUser(data, transaction) {
  return model.userStudentEmployeeModel.unscoped().create(data, { transaction });
}

export async function findEmailByEmail(email) {
  const result = await model.userModel.unscoped().findOne({
    where: {
      email: { [Op.eq]: email },
    },
  });

  if (!result) {
    return null;
  }

  const institute = await model.instituteModel.unscoped().findOne({
    where: { instituteId: result.defaultInstituteId },
  });

  result.dataValues.instituteName = institute?.instituteName || null;
  return result;
}

export async function adminRegisterStudentAndEmployee(data, transaction) {
  return model.userModel.unscoped().create(data, { transaction });
}

export async function getAdminRegisterStudent() {
  try {
    return model.userStudentEmployeeModel.unscoped().findAll({
      where: {
        student_id: { [Op.ne]: null },
      },
      attributes: ["userStudentEmployeeId", "userId", "studentId", "employeeId"],
      include: [
        {
          model: model.userModel.unscoped(),
          as: "userDetails",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
          where: buildScope(model.userModel),
          required: true,
        },
        {
          model: model.studentModel.unscoped(),
          as: "studentDetails",
          required: true,
          attributes: ["studentId", "scholarNumber", "enrollNumber", "firstName"],
          where: buildScope(model.studentModel),
          include: [
            {
              model: model.courseModel.unscoped(),
              as: "course",
              attributes: ["courseName", "courseId", "courseCode", "capacity"],
              where: buildScope(model.courseModel),
              required: false,
            },
            {
              model: model.classStudentMapperModel.unscoped(),
              as: "studentMapped",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "student_id", "class_sections_id"] },
            },
            {
              model: model.classSectionModel.unscoped(),
              as: "studentSections",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
              where: buildScope(model.classSectionModel),
              required: false,
            },
            {
              model: model.semesterModel.unscoped(),
              as: "studentSemester",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
              where: buildScope(model.semesterModel),
              required: false,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching adimn Register student details:", error);
    throw error;
  }
}

export async function getAdminRegisterEmployee() {
  try {
    const users = await model.userStudentEmployeeModel.unscoped().findAll({
      where: {
        employee_id: { [Op.ne]: null },
      },
      attributes: ["userStudentEmployeeId", "employeeId", "userId"],
      include: [
        {
          model: model.userModel.unscoped(),
          as: "userDetails",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
          where: {
            ...buildScope(model.userModel),
            role: { [Op.ne]: "Student" },
          },
          required: true,
        },
        {
          model: model.employeeModel.unscoped(),
          as: "employeeDetails",
          required: true,
          attributes: ["employee_id", "employeeName"],
          where: buildScope(model.employeeModel),
          include: [
            {
              model: model.roleModel.unscoped(),
              as: "employeeRole",
              attributes: ["roleId", "role"],
            },
          ],
        },
      ],
    });

    return users.map((user) => ({
      userStudentEmployeeId: user.userStudentEmployeeId,
      userId: user.userId,
      userData: user,
      employeeId: user.employeeId,
      roleId: user?.employeeDetails?.employeeRole?.roleId,
      role: user?.employeeDetails?.employeeRole?.role,
    }));
  } catch (error) {
    console.error("Error fetching admin register employee details:", error);
    throw error;
  }
}

export async function changePassword(email, data, transaction) {
  try {
    return model.userModel.unscoped().update(data, {
      where: { email },
      transaction,
    });
  } catch (error) {
    console.error(`Error updating self password or login ${email}:`, error);
    throw error;
  }
}

export async function saveToUserRolePermission(data, transaction) {
  return model.userRolePermissionModel.unscoped().bulkCreate(data, { transaction });
}

export async function getUserRoleAndPermissionsByUserId(userId) {
  try {
    return model.userRolePermissionModel.unscoped().findAll({
      attributes: ["role_id", "permission_id", "user_id"],
      where: { user_id: userId },
      include: [
        {
          model: model.userModel.unscoped(),
          as: "user",
          attributes: ["userName", "email", "userId"],
        },
        {
          model: model.roleModel.unscoped(),
          as: "userRole",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        },
        {
          model: model.permissionModel.unscoped(),
          as: "userPermission",
          attributes: ["permissionId", "permission"],
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching Role Permission details:", error);
    throw error;
  }
}

export async function findStatusByUserId(userId) {
  return scoped(model.userModel).findOne({
    where: { userId },
  });
}

export async function changeStatus(userId, data) {
  try {
    const existing = await scoped(model.userModel).findOne({
      attributes: ["userId"],
      where: { userId },
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.userModel).update(data, { where: { userId } });
  } catch (error) {
    console.error(`Error updating status ${userId}:`, error);
    throw error;
  }
}

export async function headRegister(data, transaction) {
  try {
    return scoped(model.userModel).create(data, { transaction });
  } catch (error) {
    console.error("Error in userRepository.register:", error);
    throw new Error("Failed to create user");
  }
}

export async function updateUser(userId, data, transaction) {
  try {
    const existing = await scoped(model.userModel).findOne({
      attributes: ["userId"],
      where: { userId },
      transaction,
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.userModel).update(data, {
      where: { userId },
      transaction,
    });
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error;
  }
}

export async function getUserByUserId(userId) {
  return scoped(model.userModel).findOne({
    where: { userId },
    attributes: { exclude: ["password", "dummyPassword"] },
    include: [
      {
        association: "employee",
        required: false,
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
      },
      {
        association: "institute",
        attributes: ["instituteId", "instituteName", "campusId"],
      },
    ],
  });
}

export async function updateStudent(studentId, data, transaction) {
  try {
    const existing = await scoped(model.studentModel).findOne({
      attributes: ["studentId"],
      where: { studentId },
      transaction,
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.studentModel).update(data, {
      where: { studentId },
      transaction,
    });
  } catch (error) {
    console.error(`Error updating student ${studentId}:`, error);
    throw error;
  }
}

export async function updateEmployee(employeeId, data, transaction) {
  try {
    const existing = await scoped(model.employeeModel).findOne({
      attributes: ["employeeId"],
      where: { employeeId },
      transaction,
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.employeeModel).update(data, {
      where: { employeeId },
      transaction,
    });
  } catch (error) {
    console.error(`Error updating employee ${employeeId}:`, error);
    throw error;
  }
}

export async function getAllUsers(page, limit, search) {
  try {
    const store = requestContext.getStore();
    const offset = (page - 1) * limit;
    const whereCondition = {
      ...(store?.instituteId && { defaultInstituteId: store.instituteId }),
      ...(search && {
        [Op.or]: [
          { userName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ],
      }),
    };

    const { count, rows } = await scoped(model.userModel).findAndCountAll({
      where: whereCondition,
      attributes: { exclude: ["password", "deletedAt"] },
      offset: parseInt(offset, 10),
      limit: parseInt(limit, 10),
      order: [["createdAt", "DESC"]],
    });

    return { totalCount: count, users: rows };
  } catch (error) {
    console.error("Error in getAllUsers repository:", error);
    throw error;
  }
}
