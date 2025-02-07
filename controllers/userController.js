import * as userService from "../services/userServices.js";
import * as userRepository from "../repository/userRepository.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserRolePermissionByUserId } from "../repository/userRolePermissionRepository.js";

// register
export const register = async (req, res) => {
  // const universityId = 1;
  try {
    const { email, password, userName, phone,universityId} = req.body;
    const existingEmail = await userRepository.findEmailByEmail(email);

    // Check if all required fields are provided

    if (!(email && password && userName && phone && universityId)) {
      res.status(400).send("All input is required :-");

      // Check if email already exists
    } else if (existingEmail) {
      res.status(400).send("Email already exists");

      // register the user
    } else {
      const result = await userService.register(req.body);
      res.status(200).send(result);
    }
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).send("Internal server error");
  }
};

// login

export const login = async (req, res) => {
  try {
    let result;
    let userData;
    let { email, password } = req.body;
    const existingEmail = await userRepository.findEmailByEmail(email);

    if (!existingEmail) {
      return res.status(400).send("Email does not exist");
    }

    if (existingEmail.dataValues.status === 'InActive') {
      return res.status(400).send("Please Contact To The Admin");
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingEmail.password
    );

    if (!isPasswordCorrect) {
      return res.status(400).send("Incorrect password");
    }

  //  const token = jwt.sign({ email: existingEmail.email }, process.env.SECRET_KEY,{ expiresIn: process.env.TOKEN_TIME });
  const token = jwt.sign({ email: existingEmail.email }, 'warrdelUniversityERPWarrdelUniversityERP',{ expiresIn: '4h'});
  if(existingEmail.dataValues.dummyPassword){
    result = await userService.emptyPassword(req.body,existingEmail)
    userData = await userRepository.findEmailByEmail(email);
  }  
  const userPermission = await getUserRolePermissionByUserId(existingEmail.dataValues.userId)
 
   res.cookie("token", token);
   res.status(200).json({
    status: true,
    message: "User logged in successfully",
    token,
    userPermission,
    result,
    userData,
    existingEmail
  });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Internal server error");
  }
 
};

// admin register student and employee
export const adminRegisterStudentAndEmployee = async (req, res) => {
  try {
    const { role,courseId,classSectionId,employeeId} = req.body;

    if (!(role )) {
      res.status(400).send("All input is required");
    } else {
      const result = await userService.adminRegisterStudentAndEmployee(req.body);
      res.status(200).send(result);
    }
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).send("Internal server error");
  }
};

export async function getAdminRegisterStudentAndEmployee(req, res) {
  const universityId = req.user.universityId;  
  try {
      const user = await userService.getAdminRegisterStudentAndEmployee(universityId);
      res.status(200).json(user);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
}

// change register password student and employee
export const changePassword = async (req, res) => {
  try {
    const { email,oldPassword,password,confirmPassword} = req.body;
    
    const existingEmail = await userRepository.findEmailByEmail(email);
    if (!(email && oldPassword && password)) {
      res.status(400).send("All input is required");
    }
    if (password !== confirmPassword) {
      return res.status(400).send("new pasword and confirm password does not match");
    }
    if (!existingEmail) {
      return res.status(400).send("Email does not exist");
    }
    const isPasswordCorrect = await bcrypt.compare(
      oldPassword,
      existingEmail.dataValues.dummyPassword,
    );
    

    // if (!isPasswordCorrect) {
    //   return res.status(400).send("Incorrect Old Password");
    // }
    //  else {
      const result = await userService.changePassword(req.body);
      res.status(200).send(result);
    // }
  } catch (error) {
    console.error("Error during change password:", error);
    res.status(500).send("Internal server error");
  }
};

export const changeStatus = async (req, res) => {
  try {
    const {userId} = req.query;
    if (!(userId)) {
      res.status(400).send("userId is required");
    } else {
      const result = await userService.changeStatus(userId);
      res.status(200).send(result);
    }
  } catch (error) {
    console.error("Error during change status:", error);
    res.status(500).send("Internal server error");
  }
};