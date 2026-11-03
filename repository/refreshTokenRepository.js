import { Op } from "sequelize";
import * as model from "../models/index.js";

/**
 * Creates a new refresh token record in the database.
 */
export async function createRefreshTokenRecord(data, transaction = null) {
  return model.refreshTokenModel.create(data, { transaction });
}

/**
 * Finds a refresh token by its SHA-256 hash.
 * Includes user information for immediate validation.
 */
export async function findRefreshTokenByHash(tokenHash) {
  return model.refreshTokenModel.findOne({
    where: { tokenHash },
    include: [
      {
        model: model.userModel,
        as: "user",
        attributes: [
          "userId",
          "email",
          "userName",
          "defaultInstituteId",
          "defaultAcademicYearId",
          "universityId",
          "status",
        ],
        include: [
          {
            model: model.roleModel,
            as: "defaultRoleRef",
            attributes: ["roleId", "role"],
            required: false,
          },
        ],
      },
    ],
  });
}

export async function revokeToken(refreshTokenId, reason = "REVOKED", replacedByTokenId = null, transaction = null) {
  return model.refreshTokenModel.update(
    {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
      replacedByTokenId: replacedByTokenId || null,
    },
    {
      where: { refreshTokenId },
      transaction,
    }
  );
}

export async function revokeFamily(familyId, reason = "REUSE_DETECTED", transaction = null) {
  return model.refreshTokenModel.update(
    {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
    },
    {
      where: {
        familyId,
        isRevoked: false,
      },
      transaction,
    }
  );
}

export async function revokeAllUserTokens(userId, reason = "LOGOUT_ALL", transaction = null) {
  return model.refreshTokenModel.update(
    {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
    },
    {
      where: {
        userId,
        isRevoked: false,
      },
      transaction,
    }
  );
}

export async function getActiveSessionsByUserId(userId) {
  return model.refreshTokenModel.findAll({
    where: {
      userId,
      isRevoked: false,
      expiresAt: {
        [Op.gt]: new Date(),
      },
    },
    attributes: [
      "refreshTokenId",
      "deviceInfo",
      "ipAddress",
      "userAgent",
      "createdAt",
      "expiresAt",
    ],
    order: [["createdAt", "DESC"]],
  });
}

/**
 * Finds a specific session by ID belonging to a user.
 */
export async function findSessionByIdAndUser(refreshTokenId, userId) {
  return model.refreshTokenModel.findOne({
    where: {
      refreshTokenId,
      userId,
    },
  });
}

/**
 * Prunes expired or long-revoked tokens older than retention period.
 */
export async function deleteExpiredTokens(retentionDays = 30) {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  return model.refreshTokenModel.destroy({
    where: {
      [Op.or]: [
        { expiresAt: { [Op.lt]: cutoffDate } },
        { isRevoked: true, revokedAt: { [Op.lt]: cutoffDate } },
      ],
    },
  });
}
