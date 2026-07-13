import * as registerRepository from "../repository/userRepository.js";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getStudentBySectionId, getCourseByCourseId, getEmployeeByuserId } from "../repository/courseRepository.js";
var salt = bcrypt.genSaltSync(10);
import sequelize from "../database/sequelizeConfig.js";
import { getSingleRoleDetails } from "../repository/roleRepository.js";
import { getEmployeeRolePermissionByUserId } from "../repository/userRolePermissionRepository.js";
import jwt from "jsonwebtoken";
import sendEmail from "../utility/sendEmail.js";
import "dotenv/config";
import * as model from "../models/index.js";
import { PERMISSIONS } from "../const/permissions.js";
import { SCOPES } from "../const/scopes.js";
import * as userRoleService from "./userRoleService.js";

//register

export async function register(info) {
  let { userName, password, phone, email, universityId, role } = info;
  password = await bcrypt.hashSync(password, salt);

  const data = {
    userName,
    universityId: universityId,
    password,
    phone,
    email: email.toLowerCase(),
    uniqueId: uuidv4(),
  };

  return await registerRepository.register(data);
}

export async function getEmployeeRolePermissionUserId(userId) {
  try {
    const result = await getEmployeeRolePermissionByUserId(userId);
    return formatEmployeeDetailsDeep(result?.[0]?.employeeDetails);
  } catch (error) {
    console.error("Error in getEmployeeRolePermissionUserId:", error);
    throw error;
  }
}

const formatEmployeeDetailsDeep = (employee) => {
  if (!employee) return null;
  // Basic Employee Info
  const employeeInfo = {
    userId: employee.userId,
    employeeCode: employee.employeeCode,
    employeeName: employee.employeeName,
    role: employee?.employeeRole?.role,
    campusId: employee.campusId,
    instituteId: employee.instituteId,
    instituteName: employee?.employeeInstitute?.instituteName,
  };
  // Subjects Taught
  const subjects =
    employee?.teacherEmployeeData?.map((item) => {
      const subj = item?.employeeSubject?.subjects;
      const semester = item?.employeeSubject?.semestermapping;
      return {
        subjectId: subj?.subjectId,
        subjectName: subj?.subjectName,
        subjectCode: subj?.subjectCode,
        subjectType: subj?.subjectType,
        semesterName: semester?.name,
        courseName: subj?.courseInfo?.courseName,
        courseId: subj?.courseId,
      };
    }) || [];
  // Courses (distinct course names from subjects)
  const courses = Array.from(
    new Map(
      subjects
        .filter((s) => s.courseId && s.courseName)
        .map((s) => [s.courseId, { courseId: s.courseId, courseName: s.courseName }]),
    ).values(),
  );
  // Sections
  const sections =
    employee?.employeeData?.map((item) => {
      const section = item?.employeeSection;
      return {
        sectionId: section?.classSectionsId,
        sectionName: section?.section,
        className: section?.year != null ? String(section.year) : null,
        semesterId: section?.semesterId,
        courseId: section?.courseId,
        studentCount: section?.studentSections?.length || 0,
      };
    }) || [];
  // Students
  const students =
    employee?.employeeData?.flatMap((item) => {
      return (
        item?.employeeSection?.studentSections?.map((student) => ({
          studentId: student?.studentId,
          name: `${student?.firstName} ${student?.middleName || ""} ${student?.lastName || ""}`.trim(),
          scholarNumber: student?.scholarNumber,
          email: student?.email,
          mobileNumber: student?.mobileNumber,
          status: student?.studentStatus,
          sectionId: student?.classSectionsId,
          semesterId: student?.semesterId,
        })) || []
      );
    }) || [];
  // Time Table (Elective)
  const timeTable =
    employee?.timeTableMappings?.map((tt) => ({
      day: tt.day,
      period: tt.period,
      periodName: tt?.timeTablecreation?.periodName,
      startTime: tt?.timeTablecreation?.startTime,
      endTime: tt?.timeTablecreation?.endTime,
      room: tt?.classRoom?.roomNumber,
      electiveSubjectName: tt?.timeTableElective?.electiveSubjectName,
      electiveSubjectCode: tt?.timeTableElective?.electiveSubjectCode,
    })) || [];
  return {
    employeeInfo,
    courses,
    subjects,
    sections,
    timeTable,
    students,
  };
};

export async function adminRegisterStudentAndEmployee(info) {
  const transaction = await sequelize.transaction();
  const { role, courseId, classSectionId, userId, roleId } = info;

  const course = await getCourseByCourseId(courseId);
  const section = await getStudentBySectionId(classSectionId);
  const employee = await getEmployeeByuserId(userId);
  const salt = await bcrypt.genSalt(10);

  const createStudentData = (item) => {
    const dummyPassword = uuidv4();
    const password = bcrypt.hashSync(dummyPassword, salt);

    return {
      userName: item.studentMapped.scholarNumber,
      universityId: 1,
      password,
      phone: item.studentMapped.phoneNumber || null,
      email: item.studentMapped.email,
      uniqueId: uuidv4(),
      role,
      studentId: item.studentId,
      dummyPassword,
    };
  };

  const createEmployeeData = (item) => {
    const dummyPassword = uuidv4();
    const password = bcrypt.hashSync(dummyPassword, salt);

    return {
      userName: item.employeeName,
      universityId: 1,
      password,
      phone: item.address.phoneNumber || item.address.mobileNumber || null,
      email: item.address.personal_email || item.address.officalEmailId || null,
      uniqueId: dummyPassword,
      role,
      dummyPassword,
    };
  };

  const studentData = section.map(createStudentData);
  const employeeData = employee.map(createEmployeeData);

  try {
    let results;

    if (role === "Student") {
      results = await registerRepository.adminRegisterStudentAndEmployee(studentData, transaction);
      const userIds = results.map((user) => user.dataValues.userId);

      for (let i = 0; i < userIds.length; i++) {
        await registerRepository.adminUser({ userId: userIds[i], studentId: studentData[i].studentId }, transaction);
        await registerRepository.updateStudent(studentData[i].studentId, { userId: userIds[i] }, transaction);
      }

      const roleName = await getSingleRoleDetails(roleId);
      for (let i = 0; i < userIds.length; i++) {
        await userRoleService.assignRoleToUser(userIds[i], roleName?.dataValues?.role || role, [], transaction);
      }
    } else if (role != "Student") {
      results = await registerRepository.adminRegisterStudentAndEmployee(employeeData, transaction);
      const userIds = results.map((user) => user.dataValues.userId);

      const userEmployeeMapping = userIds.map((userId, index) => ({
        userId,
        employeeId: employeeData[index].employeeId,
      }));

      for (const { userId, employeeId } of userEmployeeMapping) {
        await registerRepository.adminUser({ userId, employeeId }, transaction);
        await registerRepository.updateEmployee(employeeId, { userId }, transaction);
      }

      const roleName = await getSingleRoleDetails(roleId);
      for (let i = 0; i < userIds.length; i++) {
        await userRoleService.assignRoleToUser(userIds[i], roleName?.dataValues?.role || role, [], transaction);
      }
    } else {
      throw new Error("Invalid role");
    }

    await transaction.commit();
    return results;
  } catch (error) {
    await transaction.rollback();
    console.error("Error during registration:", error);
    throw new Error("Registration failed");
  }
}

export async function dataSaveUerRolePermission(userIds, roleId, permissions, transaction) {
  const dataToSave = [];
  const uIds = Array.isArray(userIds) ? userIds : [userIds];

  uIds.forEach((userId) => {
    permissions.forEach((perm) => {
      const resourceIds = perm.resourceIds && perm.resourceIds.length > 0 ? perm.resourceIds : [null];
      resourceIds.forEach((resId) => {
        dataToSave.push({
          userId,
          roleId,
          permission: perm.permission,
          scope: perm.scope || "INSTITUTE",
          resourceId: resId,
        });
      });
    });
  });

  try {
    await model.userRolePermissionModel.bulkCreate(dataToSave, { transaction });
    console.log("User role permission data saved successfully.");
  } catch (error) {
    console.error("Error saving user role permission data:", error);
    throw new Error("Failed to save user role permission data.");
  }
}

export async function getAdminRegisterStudentAndEmployee() {
  try {
    const [students, employees] = await Promise.all([
      registerRepository.getAdminRegisterStudent(),
      registerRepository.getAdminRegisterEmployee(),
    ]);

    return { students, employees };
  } catch (error) {
    console.error("Error fetching students and employees:", error);
    throw new Error("Failed to fetch students and employees");
  }
}

export async function emptyPassword(email, transaction) {
  return await registerRepository.changePassword(email, { dummyPassword: "" }, transaction);
}

export async function changePassword(info, transaction) {
  let { email, password } = info;
  const newPassword = await bcrypt.hashSync(password, salt);

  const data = {
    password: newPassword,
    dummyPassword: "",
    status: "active",
  };

  return await registerRepository.changePassword(email, data, transaction);
}

export async function getUserRoleAndPermissionsByUserId(userId) {
  return await registerRepository.getUserRoleAndPermissionsByUserId(userId);
}

export const studentRegister = async (registerStudentData, transaction) => {
  try {
    const { studentId, email, phoneNumber, scholarNumber, role, universityId, roleId } = registerStudentData;

    const dummyPassword = uuidv4();
    const password = bcrypt.hashSync(dummyPassword, salt);

    const data = {
      userName: scholarNumber,
      universityId: universityId,
      password: password,
      phone: phoneNumber || null,
      email: email || null,
      uniqueId: uuidv4(),
      role,
      studentId: studentId,
      dummyPassword: dummyPassword,
    };

    // Register the student and employee
    const results = await registerRepository.adminRegisterStudentAndEmployee(data, transaction);

    const userId = results.dataValues.userId;

    // Associate user and student
    await registerRepository.adminUser({ userId: userId, studentId: studentId }, transaction);

    // Roles are dynamic — only assign a role if a valid roleId was resolved.
    if (roleId != null) {
      const roleName = await getSingleRoleDetails(roleId);
      await userRoleService.assignRoleToUser(userId, roleName?.dataValues?.role || role, [], transaction);
    }

    return userId;
  } catch (error) {
    console.error("Error in student registration:", error);
    throw new Error("Failed to register student");
  }
};

export const employeeRegister = async (employeePersonalDetail, employeeRegisterData, transaction) => {
  try {
    const { personalEmail, mobileNumber } = employeePersonalDetail;
    const { universityId, roleId, employeeName, employeeId, instituteId, isTeacher } = employeeRegisterData;
    const dummyPassword = uuidv4();
    const password = bcrypt.hashSync(dummyPassword, salt);
    const data = {
      userName: employeeName,
      universityId: universityId,
      password: password,
      phone: mobileNumber || null,
      email: personalEmail || null,
      uniqueId: dummyPassword,
      employeeId: employeeId,
      dummyPassword: dummyPassword,
      defaultInstituteId: instituteId,
      isTeacher: isTeacher === true,
    };

    // Register the student and employee
    const results = await registerRepository.adminRegisterStudentAndEmployee(data, transaction);

    const userId = results.dataValues.userId;

    // Associate user and student
    if (employeeId) {
      await registerRepository.adminUser({ userId: userId, employeeId: employeeId }, transaction);
    }

    return userId;
  } catch (error) {
    console.error("Error in employee registration:", error);
    throw new Error("Failed to register employee");
  }
};


export async function changeStatus(userId) {
  try {
    const userData = await registerRepository.findStatusByUserId(userId);
    const status = userData.dataValues.status;
    const newStatus = status === "active" ? "InActive" : "active";

    // Update the status
    await registerRepository.changeStatus(userId, { status: newStatus });
  } catch (error) {
    console.error(`Error changing status for user ${userId}:`, error);
    throw error;
  }
}

export const sendLink = async (email) => {
  try {
    const user = await registerRepository.findEmailByEmail(email);
    if (!user) throw new Error("User not found");

    const jwtSecret = process.env.JWT_SECRET || "warrdelUniversityERPWarrdelUniversityERP";
    const baseUrl = process.env.FRONTEND_URL;

    if (!baseUrl) {
      throw new Error("FRONTEND_URL is not configured in environment variables");
    }

    const token = jwt.sign({ email: user.email }, jwtSecret, { expiresIn: "5m" });

    const resetLink = `${baseUrl}/password-change?token=${token}&email=${encodeURIComponent(user.email)}`;

    const emailResponse = await sendEmail(user.email, "Password Reset", resetLink);

    if (!emailResponse?.messageId) {
      throw new Error("Failed to send email. Please check email address or SMTP credentials.");
    }

    const userId = user.dataValues.userId;
    const updatedUser = await registerRepository.updateUser(userId, token);

    return {
      email: user.email,
      messageId: emailResponse.messageId,
      updated: !!updatedUser,
    };
  } catch (error) {
    console.error("Error in userService.sendLink:", error);
    throw new Error(error.message || "Internal Server Error in sendLink");
  }
};

export const forgotSendLink = async (email) => {
  try {
    const user = await registerRepository.findEmailByEmail(email);
    if (!user) throw new Error("User not found");

    const jwtSecret = process.env.JWT_SECRET || "warrdelUniversityERPWarrdelUniversityERP";
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const token = jwt.sign({ email: user.email }, jwtSecret, { expiresIn: "5m" });

    const resetLink = `${baseUrl}/forget-password-change?token=${token}&email=${encodeURIComponent(user.email)}`;

    const emailResponse = await sendEmail(user.email, "Forgot Password Reset", resetLink);

    if (!emailResponse?.messageId) {
      throw new Error("Failed to send email. Please check email address or SMTP credentials.");
    }

    return {
      email: user.email,
      messageId: emailResponse.messageId,
    };
  } catch (error) {
    console.error("Error in userService.forgotSendLink:", error);
    throw new Error(error.message || "Internal Server Error in forgotSendLink");
  }
};

export const getAllUsers = async (page = 1, limit = 10, search = "") => {
  try {
    return registerRepository.getAllUsers(page, limit, search);
  } catch (error) {
    console.error("Error in getAllUsers service:", error);
    throw error;
  }
};

export async function getMyDetails(userId) {
  const user = await registerRepository.getUserByUserId(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const userData = user.dataValues;

  // 🔐 sensitive data remove
  delete userData.password;
  delete userData.dummyPassword;

  // Fetch distinct roles from user_role_permission_scope
  const roleEntries = await model.userRolePermissionModel.findAll({
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('userRole.role')), 'roleName'],
      [sequelize.col('userRole.role_id'), 'roleId']
    ],
    where: { user_id: userId },
    include: [
      {
        model: model.roleModel,
        as: 'userRole',
        attributes: []
      }
    ],
    raw: true
  });

  userData.roles = roleEntries
    .filter(entry => entry.roleName != null && entry.roleName !== '')
    .map(entry => ({
      roleId: entry.roleId,
      roleName: entry.roleName
    }));

  return userData;
}

export async function saveUserDefaults(userId, data) {
  try {
    return await registerRepository.updateUser(userId, data);
  } catch (error) {
    console.error("Error in saveUserDefaults service:", error);
    throw error;
  }
}

async function assignNewRolesAndPermissions(userId, transaction) {
  // handled within seedLegacyRoleAndPermissions now
}

async function seedLegacyRoleAndPermissions(userId, universityId, transaction) {
  // 1. Find or create the CLIENT_ADMIN role
  let clientAdminRole = await model.roleModel.findOne({ where: { role: "CLIENT_ADMIN" }, transaction });
  if (!clientAdminRole) {
    clientAdminRole = await model.roleModel.create({ role: "CLIENT_ADMIN" }, { transaction });
  }

  // 2. Build full permission template for CLIENT_ADMIN
  //    MASTER_SECTION gets UNIVERSITY scope; all other permissions get INSTITUTE scope
  const rolePermissionRows = [];
  for (const [key, valueObj] of Object.entries(PERMISSIONS)) {
    const isMasterSection = valueObj.value === PERMISSIONS.MASTER_SECTION.value
      || valueObj.parentPermission === 'MASTER_SECTION';
    rolePermissionRows.push({
      roleId: clientAdminRole.roleId,
      permission: valueObj.value,
      scope: isMasterSection ? SCOPES.UNIVERSITY : SCOPES.INSTITUTE,
    });
  }

  // 4. Sync role_permissions template
  await model.rolePermissionMappingModel.destroy({ where: { role_id: clientAdminRole.roleId }, transaction });
  await model.rolePermissionMappingModel.bulkCreate(rolePermissionRows, { transaction });

  // 5. Assign the CLIENT_ADMIN role to the user (copies all non-perm_access_inst rows)
  await userRoleService.assignRoleToUser(userId, clientAdminRole.roleId, [], transaction);

  // 6. Explicitly insert UNIVERSITY-scoped perm_access_inst with the real roleId
  await model.userRolePermissionModel.create({
    userId,
    roleId: clientAdminRole.roleId,
    permission: PERMISSIONS.ACCESS_INSTITUTE.value,
    scope: SCOPES.UNIVERSITY,
    resourceId: universityId
  }, { transaction });
}

export async function initialSetup(info) {
  const {
    universityName = "Warrdel University",
    campusName = "Main Campus",
    campusCode = "MC01",
    instituteName = "Institute of Technology",
    instituteCode = "IOT01",
    userName = "superadmin",
    email = "admin@warrdel.com",
    password = "Admin@123",
    phone = "9999999990",
    yearTitle = "2026-2027",
    startingDate = "2026-06-01",
    endingDate = "2027-05-31",
  } = info;

  // 1. Check if email already exists
  const existingEmail = await registerRepository.findEmailByEmail(email);
  if (existingEmail) {
    throw new Error("Email already exists");
  }

  const transaction = await sequelize.transaction();

  try {
    // 2. Create University
    const university = await model.universityModel.create(
      {
        universityName,
      },
      { transaction },
    );

    // 3. Hash Password & Create User
    const hashedPassword = await bcrypt.hashSync(password, salt);
    const user = await model.userModel.create(
      {
        userName,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone,
        uniqueId: uuidv4(),
        status: "active",
        universityId: university.universityId,
      },
      { transaction },
    );

    // 4. Create Campus
    const campus = await model.campusModel.create(
      {
        universityId: university.universityId,
        campusName,
        campusCode,
        createdBy: user.userId,
      },
      { transaction },
    );

    // 5. Create Institute
    const institute = await model.instituteModel.create(
      {
        campusId: campus.campusId,
        universityId: university.universityId,
        instituteName,
        instituteCode,
        createdBy: user.userId,
      },
      { transaction },
    );

    // 6. Create Academic Year
    const academicYear = await model.acedmicYearModel.create(
      {
        universityId: university.universityId,
        instituteId: institute.instituteId,
        yearTitle,
        startingDate,
        endingDate,
        isActive: true,
        updatedBy: user.userId,
      },
      { transaction },
    );

    // 7. Update User Defaults
    await user.update(
      {
        defaultInstituteId: institute.instituteId,
        defaultAcademicYearId: academicYear.academicYearId,
      },
      { transaction },
    );

    // 8. Assign new roles and permissions
    await assignNewRolesAndPermissions(user.userId, transaction);

    // 9. Assign legacy role, permissions, and role-permissions mapping
    await seedLegacyRoleAndPermissions(user.userId, university.universityId, transaction);

    await transaction.commit();

    // Prepare return data (safe)
    const userData = user.toJSON();
    delete userData.password;
    delete userData.dummyPassword;

    return {
      success: true,
      message: "Initial client space setup completed successfully",
      data: {
        university,
        campus,
        institute,
        academicYear,
        user: userData,
      },
    };
  } catch (error) {
    await transaction.rollback();
    console.error("Error in initialSetup service:", error);
    throw error;
  }
}

export async function getGrantedAccess(userId) {
  const user = await model.userModel.findByPk(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // ── Teacher special case ────────────────────────────────────────────────────
  // Teachers have no perm_access_inst entries, so we derive their campus,
  // institute and academic years directly from their employee record.
  if (user.isTeacher === true) {
    const employee = await model.employeeModel.findOne({
      where: { userId },
      attributes: ['campusId', 'instituteId'],
    });

    const campuses = employee?.campusId
      ? await model.campusModel.findAll({ where: { campusId: employee.campusId } })
      : [];

    const institutes = employee?.instituteId
      ? await model.instituteModel.findAll({ where: { instituteId: employee.instituteId } })
      : [];

    const academicYears = employee?.instituteId
      ? await model.acedmicYearModel.findAll({
          where: { instituteId: employee.instituteId, isActive: true },
        })
      : [];

    const university = await model.universityModel.findByPk(user.universityId);

    return { university, campuses, institutes, academicYears, roles: [] };
  }
  // ────────────────────────────────────────────────────────────────────────────

  // 1. Fetch user's permission scopes for perm_access_inst
  const accessEntries = await model.userRolePermissionModel.findAll({
    where: {
      userId,
      permission: 'perm_access_inst'
    }
  });

  const allowedCampusIds = new Set();
  const allowedInstituteIds = new Set();
  let hasUniversityAccess = false;

  for (const entry of accessEntries) {
    if (entry.scope === 'UNIVERSITY') {
      hasUniversityAccess = true;
    } else if (entry.scope === 'CAMPUS' && entry.resourceId) {
      allowedCampusIds.add(entry.resourceId);
    } else if (entry.scope === 'INSTITUTE' && entry.resourceId) {
      allowedInstituteIds.add(entry.resourceId);
    }
  }

  // If UNIVERSITY scope is granted, they get all campuses and institutes under that university
  if (hasUniversityAccess) {
    const campuses = await model.campusModel.findAll({
      where: { universityId: user.universityId }
    });
    campuses.forEach(c => allowedCampusIds.add(c.campusId));

    const institutes = await model.instituteModel.findAll({
      where: { universityId: user.universityId }
    });
    institutes.forEach(i => allowedInstituteIds.add(i.instituteId));
  } else {
    // If they have CAMPUS scope, they get all institutes in those campuses
    if (allowedCampusIds.size > 0) {
      const campusInstitutes = await model.instituteModel.findAll({
        where: { campusId: { [Op.in]: Array.from(allowedCampusIds) } }
      });
      campusInstitutes.forEach(i => allowedInstituteIds.add(i.instituteId));
    }

    // If they have INSTITUTE scope, they must also see the parent campuses of those institutes
    if (allowedInstituteIds.size > 0) {
      const institutes = await model.instituteModel.findAll({
        where: { instituteId: { [Op.in]: Array.from(allowedInstituteIds) } }
      });
      institutes.forEach(i => allowedCampusIds.add(i.campusId));
    }
  }

  // Fetch the final details of campuses and institutes
  const campuses = allowedCampusIds.size > 0
    ? await model.campusModel.findAll({
      where: { campusId: { [Op.in]: Array.from(allowedCampusIds) } }
    })
    : [];

  const institutes = allowedInstituteIds.size > 0
    ? await model.instituteModel.findAll({
      where: { instituteId: { [Op.in]: Array.from(allowedInstituteIds) } }
    })
    : [];

  // Get university from the allowed institutes or fallback to user.universityId
  let university = null;
  const universityIds = new Set();
  if (institutes.length > 0) {
    institutes.forEach(i => {
      if (i.universityId) {
        universityIds.add(i.universityId);
      }
    });
  }

  if (universityIds.size > 0) {
    university = await model.universityModel.findByPk(Array.from(universityIds)[0]);
  } else {
    university = await model.universityModel.findByPk(user.universityId);
  }

  // Fetch active academic years for the allowed institutes
  const academicYears = allowedInstituteIds.size > 0
    ? await model.acedmicYearModel.findAll({
      where: {
        instituteId: { [Op.in]: Array.from(allowedInstituteIds) },
        isActive: true
      }
    })
    : [];

  // Fetch distinct roles for the user
  const roleEntries = await model.userRolePermissionModel.findAll({
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('userRole.role')), 'roleName'],
      [sequelize.col('userRole.role_id'), 'roleId']
    ],
    where: { user_id: userId },
    include: [
      {
        model: model.roleModel,
        as: 'userRole',
        attributes: []
      }
    ],
    raw: true
  });

  const roles = roleEntries
    .filter(entry => entry.roleName != null && entry.roleName !== '')
    .map(entry => ({
      roleId: entry.roleId,
      roleName: entry.roleName
    }));

  return {
    university,
    campuses,
    institutes,
    academicYears,
    roles
  };
}
