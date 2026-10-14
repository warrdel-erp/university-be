import * as userService from "../services/userServices.js";
import * as authService from "../services/authService.js";
import * as tokenService from "../utility/tokenService.js";
import * as userRepository from "../repository/userRepository.js";
import * as refreshTokenRepository from "../repository/refreshTokenRepository.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  getUserRolePermissionByUserId,
} from "../repository/userRolePermissionRepository.js";
import { getHeadDetailsByEmail } from "../repository/headRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { Op } from "sequelize";
import * as model from "../models/index.js";
import * as userRoleRepository from "../repository/userRoleRepository.js";
import {
  requestContext,
  buildRequestContextStore,
  getTenantStore,
} from "../utility/requestContext.js";
import { ErrorResponse } from "../utility/response.js";

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
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal server error"
    );
  }
};

// login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientInfo = tokenService.getClientInfo(req);

    const result = await authService.loginUser({ email, password }, clientInfo);

    // Set HTTP-only secure cookies for tokens
    tokenService.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    return res.status(200).json({
      status: true,
      message: "User logged in successfully",
      token: result.accessToken,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      existingEmail: { dummyPassword: Boolean(result.user.dummyPassword) },
      user: result.user,
    });
  } catch (error) {
    console.error("Error during login:", error);
    if (error.name === "AuthError") {
      return res.status(error.statusCode || 400).json({
        status: false,
        message: error.message,
        code: error.code || "AUTH_ERROR",
      });
    }
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
};

// refresh token rotation
export const refreshToken = async (req, res) => {
  try {
    const rawRefreshToken =
      req.body?.refreshToken ||
      req.cookies?.refreshToken ||
      req.headers["x-refresh-token"];

    if (!rawRefreshToken) {
      return res.status(400).json({
        status: false,
        message: "Refresh token is required",
        code: "REFRESH_TOKEN_REQUIRED",
      });
    }

    const clientInfo = tokenService.getClientInfo(req);
    const result = await authService.rotateRefreshToken(rawRefreshToken, clientInfo);

    // Update HTTP-only cookies with new rotated tokens
    tokenService.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    return res.status(200).json({
      status: true,
      message: "Token refreshed successfully",
      token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: result.user,
    });
  } catch (error) {
    console.error("Error during token refresh:", error);

    // If reuse was detected, ensure any stale cookies are wiped from client
    if (error.code === "TOKEN_REUSE_DETECTED") {
      tokenService.clearAuthCookies(res);
    }

    const statusCode = error.statusCode || 401;
    return res.status(statusCode).json({
      status: false,
      message: error.message || "Failed to refresh token",
      code: error.code || "REFRESH_FAILED",
    });
  }
};

// logout current session
export const logout = async (req, res) => {
  try {
    const rawRefreshToken =
      req.body?.refreshToken ||
      req.cookies?.refreshToken ||
      req.headers["x-refresh-token"];

    if (rawRefreshToken) {
      await authService.logoutUser(rawRefreshToken);
    }

    tokenService.clearAuthCookies(res);

    return res.status(200).json({
      status: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error during logout:", error);
    tokenService.clearAuthCookies(res);
    return res.status(500).json({
      status: false,
      message: "Error during logout",
    });
  }
};

// logout all sessions / devices
export const logoutAll = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.dataValues?.userId;
    await authService.logoutAllUserSessions(userId);

    tokenService.clearAuthCookies(res);

    return res.status(200).json({
      status: true,
      message: "Logged out from all devices successfully",
    });
  } catch (error) {
    console.error("Error during logout-all:", error);
    return res.status(500).json({
      status: false,
      message: "Error during logout from all devices",
    });
  }
};

// get active sessions for logged in user
export const getActiveSessions = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.dataValues?.userId;
    const currentRefreshToken =
      req.body?.refreshToken ||
      req.cookies?.refreshToken ||
      req.headers["x-refresh-token"];

    const sessions = await authService.getUserSessions(userId, currentRefreshToken);

    return res.status(200).json({
      status: true,
      message: "Active sessions retrieved successfully",
      data: sessions,
    });
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch active sessions",
    });
  }
};

// revoke a specific session
export const revokeSession = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.dataValues?.userId;
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        status: false,
        message: "Session ID is required",
      });
    }

    await authService.revokeUserSession(userId, sessionId);

    return res.status(200).json({
      status: true,
      message: "Session revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking session:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      status: false,
      message: error.message || "Failed to revoke session",
    });
  }
};

// admin register student and employee
export const adminRegisterStudentAndEmployee = async (req, res) => {
  try {
    const { role, courseId, classSectionId, userId } = req.body;

    if (!role) {
      res.status(400).send("All input is required");
    } else {
      const result = await userService.adminRegisterStudentAndEmployee(req.body);
      res.status(200).send(result);
    }
  } catch (error) {
    console.error("Error during registration:", error);
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal server error"
    );
  }
};

export async function getAdminRegisterStudentAndEmployee(req, res) {
  try {
    const user = await userService.getAdminRegisterStudentAndEmployee();
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

    await refreshTokenRepository.revokeAllUserTokens(
      existingUser.userId || existingUser.dataValues?.userId,
      "PASSWORD_CHANGED",
      transaction
    );

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

    await refreshTokenRepository.revokeAllUserTokens(
      existingUser.userId || existingUser.dataValues?.userId,
      "PASSWORD_CHANGED"
    );

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
    const { page = 1, limit = 10, search = "" } = req.query;

    const result = await userService.getAllUsers(parseInt(page), parseInt(limit), search);

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

export const saveUserDefaults = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.dataValues?.userId;
    const universityId = req.user.universityId || req.user.dataValues?.universityId;
    const { defaultInstituteId, defaultRole, defaultAcademicYearId } = req.body;

    if (defaultRole) {
      // Teachers use a static "Teacher" role that is not in user_role_permission_scope,
      // so skip role existence validation when isTeacher is true.
      if (!req.user.isTeacher) {
        // Roles can have the same name in separate universities (e.g. CLIENT_ADMIN).
        // Resolve by role name or numeric ID strictly for the user's university.
        const roleWhere = isNaN(Number(defaultRole))
          ? { role: defaultRole, universityId }
          : { roleId: Number(defaultRole), universityId };

        const role = await model.roleModel.findOne({ where: roleWhere });

        if (!role) {
          return res.status(400).json({
            success: false,
            message: `Role not found: ${defaultRole}`
          });
        }

        const hasRole = await userRoleRepository.checkUserRoleExists(userId, role.roleId);
        if (!hasRole) {
          return res.status(400).json({
            success: false,
            message: `User does not have the specified role: ${defaultRole}`
          });
        }

        // Inject the actual integer roleId into the payload so the repository can update it
        req.body.defaultRoleId = role.roleId;
      }
    }

    if (defaultInstituteId && universityId) {
      const institute = await model.instituteModel.findOne({
        where: { instituteId: defaultInstituteId, universityId },
      });
      if (!institute) {
        return res.status(400).json({
          success: false,
          message: `Institute does not belong to user's university`
        });
      }
    }

    if (defaultAcademicYearId && universityId) {
      const academicYear = await model.acedmicYearModel.findOne({
        where: { academicYearId: defaultAcademicYearId, universityId },
      });
      if (!academicYear) {
        return res.status(400).json({
          success: false,
          message: `Academic year does not belong to user's university`
        });
      }
    }

    const result = await userService.saveUserDefaults(userId, req.body);

    const currentStore = getTenantStore();
    requestContext.enterWith(
      await buildRequestContextStore({
        userId,
        defaultInstituteId,
        universityId,
        defaultRole,
        defaultAcademicYearId,
        bypass: currentStore?.bypass,
      })
    );

    req.user.defaultInstituteId = defaultInstituteId;
    req.user.defaultRole = defaultRole;
    req.user.defaultAcademicYearId = defaultAcademicYearId;

    res.status(200).json({
      success: true,
      message: "User defaults saved successfully",
      data: result
    });
  } catch (error) {
    console.error("Error in saveUserDefaults controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to save user defaults"
    });
  }
};

export const initialSetup = async (req, res) => {
  try {
    const result = await userService.initialSetup(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error during initial setup:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to complete initial setup"
    });
  }
};

export const getGrantedAccess = async (req, res) => {
  try {
    const userId = req.user.userId;
    const data = await userService.getGrantedAccess(userId);
    return res.status(200).json({
      success: true,
      message: "Granted access details fetched successfully",
      data
    });
  } catch (error) {
    console.error("Error in getGrantedAccess controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch granted access details"
    });
  }
};

export const giveFullAccess = async (req, res) => {
  try {
    const result = await userService.giveFullAccess(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in giveFullAccess controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to grant full access"
    });
  }
};




