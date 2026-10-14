import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";

// Access & Refresh token defaults and environment overrides
export const ACCESS_TOKEN_TIME = (process.env.ACCESS_TOKEN_TIME || process.env.JWT_ACCESS_EXPIRATION || "15m").trim();
export const REFRESH_TOKEN_TIME = (process.env.REFRESH_TOKEN_TIME || process.env.JWT_REFRESH_EXPIRATION || "7d").trim();

const BASE_SECRET = process.env.JWT_SECRET || "warrdelUniversityERPWarrdelUniversityERP";
export const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || BASE_SECRET;
export const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${BASE_SECRET}_refresh_v1`;

/**
 * Converts human readable duration (e.g., '15m', '7d', '24h', '300s') to seconds.
 */
export function parseDurationToSeconds(duration) {
  if (typeof duration === "number") return duration;
  const match = String(duration).trim().match(/^(\d+)\s*([smhdw])?$/i);
  if (!match) return 900; // default 15 minutes

  const value = parseInt(match[1], 10);
  const unit = (match[2] || "s").toLowerCase();

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 24 * 60 * 60;
    case "w":
      return value * 7 * 24 * 60 * 60;
    default:
      return value;
  }
}

/**
 * Calculates a future Date based on human duration.
 */
export function getExpirationDate(duration) {
  const seconds = parseDurationToSeconds(duration);
  return new Date(Date.now() + seconds * 1000);
}

/**
 * Computes a secure SHA-256 hash of a token.
 * Raw refresh tokens should NEVER be stored plaintext in the DB.
 */
export function hashToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid token supplied for hashing");
  }
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a short-lived Access Token.
 */
export function generateAccessToken(user) {
  const payload = {
    userId: user.userId || user.user_id,
    email: user.email,
    userName: user.userName || user.user_name,
    defaultInstituteId: user.defaultInstituteId || user.default_institute_id || null,
    defaultAcademicYearId: user.defaultAcademicYearId || user.default_academic_year_id || null,
    universityId: user.universityId || user.university_id || null,
    defaultRole: user.defaultRole || null,
    isTeacher: Boolean(user.isTeacher || user.is_teacher),
    status: user.status || "active",
    tokenType: "access",
  };

  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TIME,
  });
}

/**
 * Generates a long-lived cryptographically signed Refresh Token.
 */
export function generateRefreshToken(userId, existingFamilyId = null) {
  const familyId = existingFamilyId || uuidv4();
  const jti = crypto.randomBytes(32).toString("hex");

  const payload = {
    userId,
    familyId,
    jti,
    tokenType: "refresh",
  };

  const token = jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TIME,
  });

  return { token, familyId };
}

/**
 * Verifies and decodes an access token.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Verifies and decodes a refresh token.
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

/**
 * Extracts client metadata (IP, User Agent, device summary).
 */
export function getClientInfo(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const rawIp = forwarded ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress || req.ip || "unknown";
  const ipAddress = rawIp.replace(/^::ffff:/, ""); // clean IPv4 mapped address
  const userAgent = req.headers["user-agent"] || "unknown";

  let deviceInfo = "Unknown Device";
  if (/mobile/i.test(userAgent)) {
    deviceInfo = "Mobile Device";
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceInfo = "Tablet";
  } else if (/windows/i.test(userAgent)) {
    deviceInfo = "Windows PC";
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    deviceInfo = "Mac";
  } else if (/linux/i.test(userAgent)) {
    deviceInfo = "Linux PC";
  } else if (/postman/i.test(userAgent)) {
    deviceInfo = "Postman Client";
  } else if (/curl/i.test(userAgent)) {
    deviceInfo = "cURL Client";
  }

  return { ipAddress, userAgent, deviceInfo };
}

/**
 * Sets secure HTTP-only cookies for access and refresh tokens.
 */
export function setAuthCookies(res, { accessToken, refreshToken }) {
  const isProduction = process.env.NODE_ENV === "production";
  const accessMaxAge = parseDurationToSeconds(ACCESS_TOKEN_TIME) * 1000;
  const refreshMaxAge = parseDurationToSeconds(REFRESH_TOKEN_TIME) * 1000;

  const baseCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };

  if (accessToken) {
    res.cookie("accessToken", accessToken, {
      ...baseCookieOptions,
      maxAge: accessMaxAge,
    });
    // Backward compatibility with legacy 'token' cookie name
    res.cookie("token", accessToken, {
      ...baseCookieOptions,
      maxAge: accessMaxAge,
    });
  }

  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, {
      ...baseCookieOptions,
      maxAge: refreshMaxAge,
    });
  }
}

/**
 * Clears authentication cookies upon logout or session termination.
 */
export function clearAuthCookies(res) {
  const isProduction = process.env.NODE_ENV === "production";
  const clearOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };

  res.clearCookie("accessToken", clearOptions);
  res.clearCookie("token", clearOptions);
  res.clearCookie("refreshToken", clearOptions);
}
