import * as userService from "../services/userServices.js";
import * as userRepository from "../repository/userRepository.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  getUserRolePermissionByUserId,
} from "../repository/userRolePermissionRepository.js";
import { getHeadDetailsByEmail } from "../repository/headRepository.js";
import sequelize from "../database/sequelizeConfig.js";

// register
export const register = async (req, res) => {
  // const universityId = 1;
  try {
    const { email, password, userName, phone, universityId } = req.body;
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
    let userData;
    let { email, password } = req.body;
    const existingEmail = await userRepository.findEmailByEmail(email);

    if (!existingEmail) {
      return res.status(400).send("Email does not exist");
    }

    if (existingEmail.dataValues.status === "InActive") {
      return res.status(400).send("Please Contact To The Admin");
    }

    const isPasswordCorrect = await bcrypt.compare(password, existingEmail.password);

    if (!isPasswordCorrect) {
      return res.status(400).send("Incorrect password");
    }

    // const employeePermission = await getEmployeeRolePermissionByUserId(existingEmail.dataValues.userId)
    const token = jwt.sign(existingEmail.dataValues, process.env.JWT_SECRET, {
      expiresIn: process.env.TOKEN_TIME || undefined,
    });



    res.cookie("token", token);

    res.status(200).json({
      status: true,
      message: "User logged in successfully",
      token,
      existingEmail: { dummyPassword: Boolean(existingEmail.dataValues?.dummyPassword) },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Internal server error");
  }
};

// admin register student and employee
export const adminRegisterStudentAndEmployee = async (req, res) => {
  try {
    const { role, courseId, classSectionId, employeeId } = req.body;

    if (!role) {
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
  const instituteId = req.user.instituteId;
  const role = req.user.role;
  try {
    const user = await userService.getAdminRegisterStudentAndEmployee(universityId, instituteId, role);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// change register password student and employee
// export const changePassword = async (req, res) => {
//   try {
//     const { email, oldPassword, password, confirmPassword } = req.body;

//     if (!email || !oldPassword || !password || !confirmPassword) {
//       return res.status(400).json({ message: "All input fields are required" });
//     }

//     if (password !== confirmPassword) {
//       return res
//         .status(400)
//         .json({ message: "New password and confirm password do not match" });
//     }

//     const existingUser = await userRepository.findEmailByEmail(email);
//     if (!existingUser) {
//       return res.status(404).json({ message: "Email does not exist" });
//     }

//     const isOldPasswordCorrect = (oldPassword === existingUser.dummyPassword);
//     if (!isOldPasswordCorrect) {
//       return res.status(400).json({ message: "Incorrect old password" });
//     }

//     const updatedUser = await userService.changePassword({ email, password });

//     return res.status(200).json({
//       message: "Password changed successfully",
//       data: updatedUser,
//     });
//   } catch (error) {
//     console.error("Error during password change:", error);
//     return res
//       .status(500)
//       .json({ message: "Internal server error", error: error.message });
//   }
// };

export const changePassword = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { email, oldPassword, password, confirmPassword } = req.body;

    if (!email || !oldPassword || !password || !confirmPassword) {
      return res.status(400).json({ message: "All input fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match" });
    }

    const existingUser = await userRepository.findEmailByEmail(email);
    if (!existingUser) {
      return res.status(404).json({ message: "Email does not exist" });
    }

    let isOldPasswordCorrect = false;

    if (existingUser.dummyPassword && existingUser.dummyPassword.trim() !== "") {
      isOldPasswordCorrect = oldPassword === existingUser.dummyPassword;
    } else {
      isOldPasswordCorrect = await bcrypt.compare(oldPassword, existingUser.password);
    }

    if (!isOldPasswordCorrect) {
      return res.status(400).json({ message: "Incorrect old password" });
    }


    const updatedUser = await userService.changePassword({ email, password }, transaction);

    await userService.emptyPassword(existingUser.dataValues?.email, transaction);

    await transaction.commit();

    return res.status(200).json({
      message: "Password changed successfully",
      data: updatedUser,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error during password change:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const changeStatus = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
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

export const sendLink = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await userService.sendLink(email.trim());

    if (result && result.email && result.messageId) {
      return res.status(200).json({
        success: true,
        message: "Password reset link sent to email successfully",
        data: result,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to send password reset link. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error in sendLink controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    const existingUser = await userRepository.findEmailByEmail(email);
    if (!existingUser) {
      return res.status(404).json({ message: "Email does not exist" });
    }

    const result = await userService.forgotSendLink(email.trim());

    if (result && result.email && result.messageId) {
      return res.status(200).json({
        success: true,
        message: "Frogot Password reset link sent to email successfully",
        data: result,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to send forgot password reset link. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error in sendLink controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const forgotChangePassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All input fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match" });
    }

    const existingUser = await userRepository.findEmailByEmail(email);
    if (!existingUser) {
      return res.status(404).json({ message: "Email does not exist" });
    }

    const updatedUser = await userService.changePassword({ email, password });

    return res.status(200).json({
      message: "Password changed successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error during password change:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


export const getMyDetails = async (req, res) => {
  try {

    const userId = req.user.userId;

    const userData = await userService.getMyDetails(userId);

    return res.status(200).json({
      status: true,
      data: userData
    });

  } catch (error) {
    console.error("Error in getMyDetails:", error);
    return res.status(500).json({
      status: false,
      message: error.message
    });
  }
};
export const getAllUsers = async (req, res) => {
  try {
    const { universityId } = req.user;
    const { instituteId, page = 1, limit = 10, search = "" } = req.query;

    const result = await userService.getAllUsers(universityId, instituteId, parseInt(page), parseInt(limit), search);

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: result
    });
  } catch (error) {
    console.error("Error in getAllUsers controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users"
    });
  }
};


