import * as registerRepository from "../repository/userRepository.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';
import { getStudentBySectionId, getCourseByCourseId, getEmployeeByemployeeId } from "../repository/courseRepository.js";
var salt = bcrypt.genSaltSync(10);
import sequelize from '../database/sequelizeConfig.js';
import { getPermissionByRole } from "../repository/rolePermissionMappingRepository.js";
import { getSingleRoleDetails } from "../repository/roleRepository.js";
import { getEmployeeRolePermissionByUserId } from "../repository/userRolePermissionRepository.js";
import jwt from "jsonwebtoken";
import sendEmail from "../utility/sendEmail.js";
import 'dotenv/config';

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
    role
  };

  return await registerRepository.register(data);
};

export async function getEmployeeRolePermissionUserId(userId) {
  try {
    const result = await getEmployeeRolePermissionByUserId(userId);
    return formatEmployeeDetailsDeep(result?.[0]?.employeeDetails);
  } catch (error) {
    console.error('Error in getEmployeeRolePermissionUserId:', error);
    throw error;
  }
};

const formatEmployeeDetailsDeep = (employee) => {
  if (!employee) return null;
  // Basic Employee Info
  const employeeInfo = {
    employeeId: employee.employeeId,
    employeeCode: employee.employeeCode,
    employeeName: employee.employeeName,
    role: employee?.employeeRole?.role,
    campusId: employee.campusId,
    instituteId: employee.instituteId,
    academicYearId: employee.acedmicYearId,
    instituteName: employee?.employeeInstitute?.instituteName,
  };
  // Subjects Taught
  const subjects = employee?.teacherEmployeeData?.map(item => {
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
        .filter(s => s.courseId && s.courseName)
        .map(s => [s.courseId, { courseId: s.courseId, courseName: s.courseName }])
    ).values()
  );
  // Sections
  const sections = employee?.employeeData?.map(item => {
    const section = item?.employeeSection;
    return {
      sectionId: section?.classSectionsId,
      sectionName: section?.section,
      className: section?.class,
      semesterId: section?.semesterId,
      courseId: section?.courseId,
      studentCount: section?.studentSections?.length || 0,
    };
  }) || [];
  // Students
  const students = employee?.employeeData?.flatMap(item => {
    return item?.employeeSection?.studentSections?.map(student => ({
      studentId: student?.studentId,
      name: `${student?.firstName} ${student?.middleName || ''} ${student?.lastName || ''}`.trim(),
      scholarNumber: student?.scholarNumber,
      email: student?.email,
      mobileNumber: student?.mobileNumber,
      status: student?.studentStatus,
      sectionId: student?.classSectionsId,
      semesterId: student?.semesterId,
    })) || [];
  }) || [];
  // Time Table (Elective)
  const timeTable = employee?.timeTableMappings?.map(tt => ({
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
    students
  };
};

export async function adminRegisterStudentAndEmployee(info) {
  const transaction = await sequelize.transaction();
  const { role, courseId, classSectionId, employeeId, roleId } = info;

  const course = await getCourseByCourseId(courseId);
  const section = await getStudentBySectionId(classSectionId);
  const employee = await getEmployeeByemployeeId(employeeId);
  const salt = await bcrypt.genSalt(10);

  const createStudentData = (item) => {
    const dummyPassword = uuidv4();
    const password = bcrypt.hashSync(dummyPassword, salt);

    return {
      userName: item.studentMapped.scholarNumber,
      universityId: 1,
      password,
      phone: item.studentMapped.phoneNumber || 'null',
      email: item.studentMapped.email || 'null',
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
      phone: item.address.phoneNumber || item.address.mobileNumber || 'null',
      email: item.address.personal_email || item.address.officalEmailId || 'null',
      uniqueId: dummyPassword,
      role,
      dummyPassword,
    };
  };

  const studentData = section.map(createStudentData);
  const employeeData = employee.map(createEmployeeData);

  try {
    let results;

    if (role === 'Student') {
      results = await registerRepository.adminRegisterStudentAndEmployee(studentData, transaction);
      const userIds = results.map(user => user.dataValues.userId);

      for (let i = 0; i < userIds.length; i++) {
        await registerRepository.adminUser({ userId: userIds[i], studentId: studentData[i].studentId }, transaction);
        await registerRepository.updateStudent(studentData[i].studentId, { userId: userIds[i] }, transaction);
      }

      const roleAndPermission = await getPermissionByRole(roleId);
      const permissionId = roleAndPermission.map(permission => permission.dataValues.permission_id);
      const data = { userIds, roleId, permissionId };
      await dataSaveUerRolePermission(userIds, roleId, permissionId, transaction)
    } else if (role != 'Student') {
      results = await registerRepository.adminRegisterStudentAndEmployee(employeeData, transaction);
      const userIds = results.map(user => user.dataValues.userId);

      const userEmployeeMapping = userIds.map((userId, index) => ({
        userId,
        employeeId: employeeId[index % employeeId.length], // map them in order
      }));

      for (const { userId, employeeId } of userEmployeeMapping) {
        await registerRepository.adminUser({ userId, employeeId }, transaction);
        await registerRepository.updateEmployee(employeeId, { userId }, transaction);
      }

      const roleAndPermission = await getPermissionByRole(roleId);
      const permissionId = roleAndPermission.map(permission => permission.dataValues.permission_id);
      const data = { userIds, roleId, permissionId };
      await dataSaveUerRolePermission(userIds, roleId, permissionId, transaction)
    } else {
      throw new Error('Invalid role');
    }

    await transaction.commit();
    return results;
  } catch (error) {
    await transaction.rollback();
    console.error('Error during registration:', error);
    throw new Error('Registration failed');
  }
};


export async function dataSaveUerRolePermission(userId, roleId, permissionIds, transaction) {
  const dataToSave = [];

  // userIds.forEach(userId => {
  permissionIds.forEach(permissionId => {
    dataToSave.push({
      userId,
      roleId,
      permissionId,
    });
  });
  // });

  try {
    await registerRepository.saveToUserRolePermission(dataToSave, transaction);
    console.log('User role permission data saved successfully.');
  } catch (error) {
    console.error('Error saving user role permission data:', error);
    throw new Error('Failed to save user role permission data.');
  }
}


export async function getAdminRegisterStudentAndEmployee(universityId, instituteId, role) {
  try {
    const [students, employees] = await Promise.all([
      registerRepository.getAdminRegisterStudent(universityId, instituteId, role),
      registerRepository.getAdminRegisterEmployee(universityId, instituteId, role),
    ]);

    return { students, employees };

  } catch (error) {
    console.error('Error fetching students and employees:', error);
    throw new Error('Failed to fetch students and employees');
  }
};

export async function emptyPassword(data, existingdata) {
  const { email, dummyPassword, status } = existingdata.dataValues;
  const updatedData = {
    password: '',
    status: 'inActive'
  };
  return await registerRepository.changePassword(email, updatedData);
}


export async function changePassword(info) {
  let { email, password } = info;
  const newPassword = await bcrypt.hashSync(password, salt);

  const data = {
    password: newPassword,
    dummyPassword: '',
    status: 'active'
  };

  return await registerRepository.changePassword(email, data);
};

export async function getUserRoleAndPermissionsByUserId(userId) {
  // console.log(`Fetching roles and permissions for userId: ${userId}`);

  const data = await registerRepository.getUserRoleAndPermissionsByUserId(userId);
  // console.log(`Raw data received:`, JSON.stringify(data, null, 2));

  const groupedData = data.reduce((acc, item) => {
    const uid = item.user_id;

    if (!uid) {
      console.warn(`Skipping item with missing user_id:`, item);
      return acc;
    }

    if (!acc[uid]) {
      acc[uid] = {
        user: item.user,
        userRole: item.userRole,
        permissions: [],
      };
    }

    const permissions = acc[uid].permissions;
    // console.log(`Current permissions for user ${uid}:`, permissions);

    if (!permissions.some(p => p.permissionId === item.permission_id)) {
      if (item.userPermission) {
        permissions.push(item.userPermission);
      } else {
        console.warn(`Missing userPermission for item:`);
      }
    }

    return acc;
  }, {});

  const result = Object.values(groupedData);
  // console.log(`Final grouped result:`, JSON.stringify(result, null, 2));
  return result;
};

export const studentRegister = async (registerStudentData, transaction) => {
  try {
    const { studentId, email, phoneNumber, scholarNumber, role, universityId, roleId } = registerStudentData;

    const dummyPassword = uuidv4();
    const password = bcrypt.hashSync(dummyPassword, salt);

    const data = {
      userName: scholarNumber,
      universityId: universityId,
      password: password,
      phone: phoneNumber || 'null',
      email: email || 'null',
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

    // Get permissions by role
    const roleAndPermission = await getPermissionByRole(roleId);
    const permissionId = roleAndPermission.map(permission => permission.dataValues.permission_id);

    // Save user role and permissions
    await dataSaveUerRolePermission(userId, roleId, permissionId, transaction);

    return userId;
  } catch (error) {
    console.error('Error in student registration:', error);
    throw new Error('Failed to register student');
  }
};


export const employeeRegister = async (employeePersonalDetail, employeeRegisterData, transaction) => {
  try {

    const { personalEmail, mobileNumber } = employeePersonalDetail
    const { universityId, roleId, employeeName, employeeId, instituteId } = employeeRegisterData
    const dummyPassword = uuidv4();
    const password = bcrypt.hashSync(dummyPassword, salt);
    const roleName = await getSingleRoleDetails(roleId);
    const role = roleName?.dataValues?.role
    const data = {
      userName: employeeName,
      universityId: universityId,
      password: password,
      phone: mobileNumber || 'null',
      email: personalEmail || 'null',
      uniqueId: dummyPassword,
      role,
      employeeId: employeeId,
      dummyPassword: dummyPassword,
      instituteId: instituteId,
    };

    // Register the student and employee
    const results = await registerRepository.adminRegisterStudentAndEmployee(data, transaction);

    const userId = results.dataValues.userId;

    // Associate user and student
    if (employeeId) {
      await registerRepository.adminUser({ userId: userId, employeeId: employeeId }, transaction);
    }

    // Get permissions by role
    const roleAndPermission = await getPermissionByRole(roleId);
    const permissionId = roleAndPermission.map(permission => permission.dataValues.permission_id);

    // Save user role and permissions
    await dataSaveUerRolePermission(userId, roleId, permissionId, transaction);

    return userId;
  } catch (error) {
    console.error('Error in employee registration:', error);
    throw new Error('Failed to register employee');
  }
};

export async function changeStatus(userId) {
  try {
    const userData = await registerRepository.findStatusByUserId(userId);
    const status = userData.dataValues.status;
    const newStatus = status === 'active' ? 'InActive' : 'active';

    // Update the status
    await registerRepository.changeStatus(userId, { status: newStatus });

  } catch (error) {
    console.error(`Error changing status for user ${userId}:`, error);
    throw error;
  }
};

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

export const getAllUsers = async (universityId, instituteId, page = 1, limit = 10, search = "") => {
  try {
    return await registerRepository.getAllUsers(universityId, instituteId, page, limit, search);
  } catch (error) {
    console.error('Error in getAllUsers service:', error);
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

  return userData;
}