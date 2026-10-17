import jwt from "jsonwebtoken";
import { findEmailByEmail } from "../repository/userRepository.js";
import {
  requestContext,
  buildRequestContextStore,
} from "../utility/requestContext.js";
import { ACCESS_SECRET } from "../utility/tokenService.js";

export default async function useAuth(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  // 2. Fallback to HttpOnly cookies
  if (!token && req.cookies) {
    token = req.cookies.accessToken || req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      status: false,
      message: "Authorization token missing",
      code: "AUTH_MISSING",
    });
  }

  try {
    // Decode and verify the access token using ACCESS_SECRET (fallback to JWT_SECRET)
    const decoded = jwt.verify(token, ACCESS_SECRET);
    const { email } = decoded;

    if (!email) {
      return res.status(401).json({
        status: false,
        message: "Invalid token payload",
        code: "INVALID_TOKEN_PAYLOAD",
      });
    }

    // Fetch user details from email
    const userDetail = await findEmailByEmail(email);
    if (!userDetail) {
      return res.status(401).json({
        status: false,
        message: "Invalid user",
        code: "USER_NOT_FOUND",
      });
    }

    if (userDetail.dataValues?.status === "InActive") {
      return res.status(403).json({
        status: false,
        message: "User account is inactive. Please contact admin.",
        code: "USER_INACTIVE",
      });
    }

    req.user = userDetail;

    // Build the request context store with tenant scoping info
    const store = await buildRequestContextStore({
      userId: req.user.dataValues.userId,
      defaultInstituteId: req.user.dataValues.defaultInstituteId,
      universityId: req.user.dataValues.universityId,
      defaultRole: req.user.defaultRole || req.user.dataValues?.defaultRole,
      defaultAcademicYearId: req.user.defaultAcademicYearId,
      bypass: req.bypassScope,
    });

    requestContext.run(store, () => {
      next();
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: false,
        message: "Access token has expired",
        code: "TOKEN_EXPIRED",
      });
    }

    console.error("Token verification failed:", error);
    return res.status(401).json({
      status: false,
      message: "Invalid or expired token",
      code: "INVALID_TOKEN",
    });
  }
}
