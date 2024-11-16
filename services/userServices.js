import * as registerRepository from "../repository/userRepository.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';
import { getStudentBySectionId, getCourseByCourseId,getEmployeeByemployeeId } from "../repository/courseRepository.js";
var salt = bcrypt.genSaltSync(10);
import sequelize from '../database/sequelizeConfig.js';
import { getPermissionByRole } from "../repository/rolePermissionMappingRepository.js";

//register

export async function register(info) {
  let { userName, password, phone, email, universityId ,role} = info;
  password = await bcrypt.hashSync(password, salt);

  const data = {
    userName,
    universityId: 1,
    password,
    phone,
    email: email.toLowerCase(),
    uniqueId: uuidv4(),
    role
  };

  return await registerRepository.register(data);
}

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
      uniqueId: uuidv4(),
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
      }

      const roleAndPermission = await getPermissionByRole(roleId);
      const permissionId = roleAndPermission.map(permission => permission.dataValues.permission_id);
      const data = { userIds, roleId, permissionId };
      await dataSaveUerRolePermission(userIds,roleId,permissionId,transaction)
    } else if (role === 'Employee') {
      results = await registerRepository.adminRegisterStudentAndEmployee(employeeData, transaction);
      const userIds = results.map(user => user.dataValues.userId);

      const userEmployeeMapping = userIds.map((userId, index) => ({
        userId,
        employeeId: employeeId[index % employeeId.length], // map them in order
      }));

      for (const { userId, employeeId } of userEmployeeMapping) {
        await registerRepository.adminUser({ userId, employeeId }, transaction);
      }

      const roleAndPermission = await getPermissionByRole(roleId);
      const permissionId = roleAndPermission.map(permission => permission.dataValues.permission_id);
      const data = { userIds, roleId, permissionId };
      await dataSaveUerRolePermission(userIds,roleId,permissionId,transaction)
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


export async function dataSaveUerRolePermission(userIds, roleId, permissionIds,transaction) {
  const dataToSave = [];

  userIds.forEach(userId => {
    permissionIds.forEach(permissionId => {
      dataToSave.push({
        userId,
        roleId,
        permissionId,
      });
    });
  });

  try {
    await registerRepository.saveToUserRolePermission(dataToSave,transaction);
    console.log('User role permission data saved successfully.');
  } catch (error) {
    console.error('Error saving user role permission data:', error);
    throw new Error('Failed to save user role permission data.');
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
    console.error('Error fetching students and employees:', error);
    throw new Error('Failed to fetch students and employees');
  }
};

export async function emptyPassword(data, existingdata) {  
  const { email, dummyPassword, status } = existingdata.dataValues;
  const updatedData = {
    password:'',
    status: 'inActive'
  };
  return await registerRepository.changePassword(email, updatedData);
}


export async function changePassword(info) {
  let { email,password } = info;
  const newPassword = await bcrypt.hashSync(password, salt);

  const data = {
    password:newPassword,
    dummyPassword :'',
    status:'active'
  };

  return await registerRepository.changePassword(email,data);
};

export async function getUserRoleAndPermissionsByUserId(userId) {
  const data = await registerRepository.getUserRoleAndPermissionsByUserId(userId);
    const groupedData = data.reduce((acc, item) => {
    const userId = item.user_id;
    const roleId = item.role_id;
    if (!acc[userId]) {
      acc[userId] = {
        user: item.user,
        userRole: item.userRole,
        permissions: []
      };
    }
    const existingPermissions = acc[userId].permissions;
    if (!existingPermissions.find(p => p.permissionId === item.permission_id)) {
      existingPermissions.push(item.userPermission);
    }

    return acc;
  }, {});

  const result = Object.values(groupedData);  
    return result;
};