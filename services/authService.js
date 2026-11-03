import bcrypt from "bcryptjs";
import sequelize from "../database/sequelizeConfig.js";
import * as userRepository from "../repository/userRepository.js";
import * as refreshTokenRepository from "../repository/refreshTokenRepository.js";
import * as tokenService from "../utility/tokenService.js";

 
export class AuthError extends Error {
  constructor(message, statusCode = 400, code = "AUTH_ERROR") {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
    this.code = code;
  }
}
 
export async function loginUser({ email, password }, clientInfo = {}) {
  if (!email || !password) {
    throw new AuthError("Email and password are required", 400, "MISSING_CREDENTIALS");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await userRepository.findEmailByEmail(normalizedEmail);

  if (!user) {
    throw new AuthError("Email does not exist", 400, "EMAIL_NOT_FOUND");
  }

  if (user.dataValues?.status === "InActive") {
    throw new AuthError("Please Contact To The Admin", 403, "USER_INACTIVE");
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    throw new AuthError("Incorrect password", 400, "INVALID_PASSWORD");
  }

  const userPayload = user.dataValues;

  const accessToken = tokenService.generateAccessToken(userPayload);
 
  const { token: refreshToken, familyId } = tokenService.generateRefreshToken(user.userId);
  const tokenHash = tokenService.hashToken(refreshToken);
  const expiresAt = tokenService.getExpirationDate(tokenService.REFRESH_TOKEN_TIME);

   await refreshTokenRepository.createRefreshTokenRecord({
    userId: user.userId,
    tokenHash,
    familyId,
    deviceInfo: clientInfo.deviceInfo || null,
    ipAddress: clientInfo.ipAddress || null,
    userAgent: clientInfo.userAgent || null,
    expiresAt,
    isRevoked: false,
  });

  return {
    accessToken,
    refreshToken,
    dummyPassword: Boolean(userPayload?.dummyPassword),
  };
}

export async function rotateRefreshToken(rawRefreshToken, clientInfo = {}) {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
    throw new AuthError("Refresh token is required", 400, "REFRESH_TOKEN_REQUIRED");
  }

  let decoded;
  try {
    decoded = tokenService.verifyRefreshToken(rawRefreshToken);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      try {
        const hash = tokenService.hashToken(rawRefreshToken);
        const record = await refreshTokenRepository.findRefreshTokenByHash(hash);
        if (record && !record.isRevoked) {
          await refreshTokenRepository.revokeToken(record.refreshTokenId, "EXPIRED");
        }
      } catch {}
      throw new AuthError("Refresh token has expired, please log in again", 401, "REFRESH_TOKEN_EXPIRED");
    }
    throw new AuthError("Invalid refresh token signature", 401, "INVALID_REFRESH_TOKEN");
  }

  // 2. Hash presented token and lookup database session
  const tokenHash = tokenService.hashToken(rawRefreshToken);
  const tokenRecord = await refreshTokenRepository.findRefreshTokenByHash(tokenHash);

  if (!tokenRecord) {
    throw new AuthError("Refresh token not found or invalidated", 401, "TOKEN_NOT_FOUND");
  }

  if (tokenRecord.isRevoked) {
    console.warn(`[SECURITY ALERT] Refresh token reuse detected for familyId: ${tokenRecord.familyId}, userId: ${tokenRecord.userId}. Revoking entire lineage.`);
    await refreshTokenRepository.revokeFamily(tokenRecord.familyId, "REUSE_DETECTED");
    throw new AuthError(
      "Refresh token reuse detected. All sessions in this rotation chain have been revoked for security. Please log in again.",
      403,
      "TOKEN_REUSE_DETECTED"
    );
  }

  if (new Date(tokenRecord.expiresAt) <= new Date()) {
    await refreshTokenRepository.revokeToken(tokenRecord.refreshTokenId, "EXPIRED");
    throw new AuthError("Refresh token has expired, please log in again", 401, "REFRESH_TOKEN_EXPIRED");
  }


  const user = tokenRecord.user;
  if (!user || user.status === "InActive") {
    await refreshTokenRepository.revokeToken(tokenRecord.refreshTokenId, "USER_INACTIVE");
    throw new AuthError("User account is inactive or disabled", 403, "USER_INACTIVE");
  }


  const transaction = await sequelize.transaction();
  try {
   
    const { token: newRefreshToken } = tokenService.generateRefreshToken(user.userId, tokenRecord.familyId);
    const newTokenHash = tokenService.hashToken(newRefreshToken);
    const newExpiresAt = tokenService.getExpirationDate(tokenService.REFRESH_TOKEN_TIME);

    // Save new token record
    const newRecord = await refreshTokenRepository.createRefreshTokenRecord(
      {
        userId: user.userId,
        tokenHash: newTokenHash,
        familyId: tokenRecord.familyId,
        deviceInfo: clientInfo.deviceInfo || tokenRecord.deviceInfo,
        ipAddress: clientInfo.ipAddress || tokenRecord.ipAddress,
        userAgent: clientInfo.userAgent || tokenRecord.userAgent,
        expiresAt: newExpiresAt,
        isRevoked: false,
      },
      transaction
    );

    // Revoke current token and link successor
    await tokenRecord.update(
      {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "ROTATED",
        replacedByTokenId: newRecord.refreshTokenId,
      },
      { transaction }
    );

    await transaction.commit();

 
   const userPayload = user.dataValues;
    const newAccessToken = tokenService.generateAccessToken(userPayload);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    await transaction.rollback();
    console.error("Error during refresh token rotation:", error);
    throw error;
  }
}

export async function logoutUser(rawRefreshToken) {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
    return false;
  }

  try {
    const tokenHash = tokenService.hashToken(rawRefreshToken);
    const record = await refreshTokenRepository.findRefreshTokenByHash(tokenHash);
    if (record && !record.isRevoked) {
      await refreshTokenRepository.revokeToken(record.refreshTokenId, "LOGOUT");
      return true;
    }
  } catch (error) {
    console.error("Error revoking refresh token on logout:", error);
  }
  return false;
}

export async function logoutAllUserSessions(userId) {
  if (!userId) {
    throw new AuthError("User ID is required for logging out all sessions", 400);
  }
  return refreshTokenRepository.revokeAllUserTokens(userId, "LOGOUT_ALL");
}

export async function getUserSessions(userId, currentRefreshToken = null) {
  let currentTokenId = null;
  if (currentRefreshToken) {
    try {
      const hash = tokenService.hashToken(currentRefreshToken);
      const record = await refreshTokenRepository.findRefreshTokenByHash(hash);
      if (record) currentTokenId = record.refreshTokenId;
    } catch {}
  }

  const sessions = await refreshTokenRepository.getActiveSessionsByUserId(userId);
  return sessions.map((s) => ({
    sessionId: s.refreshTokenId,
    deviceInfo: s.deviceInfo,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    isCurrent: s.refreshTokenId === currentTokenId,
  }));
}

export async function revokeUserSession(userId, sessionId) {
  const session = await refreshTokenRepository.findSessionByIdAndUser(sessionId, userId);
  if (!session) {
    throw new AuthError("Session not found or does not belong to user", 404, "SESSION_NOT_FOUND");
  }

  if (session.isRevoked) {
    return true;
  }

  await refreshTokenRepository.revokeToken(session.refreshTokenId, "USER_REVOKED");
  return true;
}
