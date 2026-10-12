import crypto from "crypto";
import jwt from "jsonwebtoken";
import { addLog } from "../services/requestLoggerService.js";

/**
 * Recursively sanitizes sensitive keys and circular structures from objects and arrays
 */
const SENSITIVE_KEYS = /password|token|secret|authorization|cookie|credit_card/i;
const MAX_DEPTH = 6;
const MAX_ARRAY_LEN = 100;
const MAX_KEYS = 100;

export const sanitizeData = (data, depth = 0, seen = new WeakSet()) => {
  try {
    if (!data || typeof data !== "object") return data;

    // Depth limit to prevent stack overflow on deep or recursive models
    if (depth > MAX_DEPTH) {
      return "[Max Depth Reached]";
    }

    // Special built-in types
    if (data instanceof Date) return data.toISOString();
    if (data instanceof RegExp) return data.toString();
    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack,
      };
    }
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) {
      return `[Buffer: ${data.length} bytes]`;
    }

    // Circular reference protection
    if (seen.has(data)) {
      return "[Circular]";
    }
    seen.add(data);

    // If it's a Sequelize model or object with toJSON, unwrap safely
    if (typeof data.toJSON === "function" && depth === 0) {
      try {
        const json = data.toJSON();
        if (json && typeof json === "object") {
          return sanitizeData(json, depth + 1, seen);
        }
        return json;
      } catch {
        // Fall back to object traversal if toJSON throws
      }
    }

    if (Array.isArray(data)) {
      const len = data.length;
      const slice = len > MAX_ARRAY_LEN ? data.slice(0, MAX_ARRAY_LEN) : data;
      const mapped = slice.map((item) => sanitizeData(item, depth + 1, seen));
      if (len > MAX_ARRAY_LEN) {
        mapped.push(`[... ${len - MAX_ARRAY_LEN} more items truncated]`);
      }
      return mapped;
    }

    const sanitized = {};
    const entries = Object.entries(data);
    const limitEntries = entries.length > MAX_KEYS ? entries.slice(0, MAX_KEYS) : entries;

    for (const [key, value] of limitEntries) {
      if (SENSITIVE_KEYS.test(key) && typeof value === "string") {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitizeData(value, depth + 1, seen);
      } else {
        sanitized[key] = value;
      }
    }

    if (entries.length > MAX_KEYS) {
      sanitized["_truncated"] = `[... ${entries.length - MAX_KEYS} more properties truncated]`;
    }

    return sanitized;
  } catch (err) {
    return "[Unserializable Data]";
  }
};

/**
 * Extracts and decodes all token body fields from headers, cookies, or authenticated context
 */
const extractTokenPayload = (req) => {
  try {
    let rawToken = null;
    const authHeader = req.headers?.authorization;
    if (authHeader && typeof authHeader === "string") {
      const parts = authHeader.split(" ");
      rawToken = parts.length === 2 ? parts[1] : parts[0];
    } else if (req.headers?.["x-access-token"]) {
      rawToken = req.headers["x-access-token"];
    } else if (req.cookies?.token) {
      rawToken = req.cookies.token;
    } else if (req.headers?.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]+)/);
      if (match) rawToken = decodeURIComponent(match[1]);
    }

    let tokenClaims = null;
    if (rawToken && typeof rawToken === "string" && rawToken.includes(".")) {
      try {
        tokenClaims = jwt.decode(rawToken);
      } catch {
        try {
          const payloadPart = rawToken.split(".")[1];
          if (payloadPart) {
            tokenClaims = JSON.parse(Buffer.from(payloadPart, "base64").toString("utf8"));
          }
        } catch {}
      }
    }

    const payload = {};
    if (tokenClaims && typeof tokenClaims === "object") {
      Object.assign(payload, tokenClaims);
    }

    // Enrich with req.user attributes if populated by authUser middleware
    const userValues = req.user?.dataValues || req.user;
    if (userValues && typeof userValues === "object") {
      for (const [k, v] of Object.entries(userValues)) {
        if (!["password", "dummyPassword", "token"].includes(k) && typeof v !== "function" && typeof v !== "object") {
          if (payload[k] === undefined) {
            payload[k] = v;
          }
        }
      }
    }

    return Object.keys(payload).length > 0 ? payload : null;
  } catch (err) {
    return null;
  }
};

/**
 * Middleware that intercepts and logs full HTTP request and response payloads
 */
export const httpAuditLogger = (req, res, next) => {
  // Skip OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    return next();
  }

  // Skip internal log api requests to avoid circular logging
  const originalUrl = req.originalUrl || req.url || "";
  if (originalUrl.startsWith("/api/logs")) {
    return next();
  }

  const logId = crypto.randomUUID();
  const startTime = Date.now();
  const clientIp =
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    "-";

  let responseBody = null;
  let bodyCaptured = false;

  // Intercept res.json
  const originalJson = res.json;
  res.json = function (body) {
    if (!bodyCaptured) {
      responseBody = body;
      bodyCaptured = true;
    }
    return originalJson.apply(this, arguments);
  };

  // Intercept res.send
  const originalSend = res.send;
  res.send = function (body) {
    if (!bodyCaptured) {
      if (typeof body === "string") {
        try {
          responseBody = JSON.parse(body);
        } catch {
          // If HTML or plain text, capture preview up to 5000 chars
          responseBody =
            body.length > 5000 ? body.slice(0, 5000) + "... [truncated]" : body;
        }
      } else if (Buffer.isBuffer(body)) {
        responseBody = `[Binary Buffer (${body.length} bytes)]`;
      } else {
        responseBody = body;
      }
      bodyCaptured = true;
    }
    return originalSend.apply(this, arguments);
  };

  // When request lifecycle finishes, store log safely
  res.on("finish", () => {
    try {
      const durationMs = Date.now() - startTime;
      const tokenBody = extractTokenPayload(req);

      const user = req.user
        ? {
            userId: req.user.userId || req.user.dataValues?.userId,
            email: req.user.email || req.user.dataValues?.email,
            role: req.user.defaultRole || req.user.role,
          }
        : tokenBody && (tokenBody.email || tokenBody.userId)
        ? {
            userId: tokenBody.userId || tokenBody.id,
            email: tokenBody.email,
            role: tokenBody.role || tokenBody.defaultRole,
          }
        : null;

      const logEntry = {
        id: logId,
        timestamp: new Date().toISOString(),
        method: req.method,
        url: originalUrl,
        path: req.path,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        durationMs,
        ip: clientIp,
        tokenBody: tokenBody || null,
        user,
        req: {
          headers: sanitizeData(req.headers),
          query: req.query || {},
          params: req.params || {},
          body: sanitizeData(req.body),
        },
        res: {
          statusCode: res.statusCode,
          headers: sanitizeData(res.getHeaders?.() || {}),
          body: sanitizeData(responseBody),
        },
      };

      addLog(logEntry);
    } catch (auditErr) {
      console.error("httpAuditLogger: Error capturing log entry:", auditErr?.message || auditErr);
    }
  });

  next();
};

export default httpAuditLogger;
