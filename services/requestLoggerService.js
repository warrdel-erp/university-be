import fs from "fs";
import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";
import { createStream } from "rotating-file-stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDirectory = path.join(__dirname, "..", "logs");

const pad = (num) => (num > 9 ? "" : "0") + num;

const generator = (time, index) => {
  const d = time || new Date();
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `requests-${year}-${month}-${day}.log`;
};

// Daily rotating file stream for structured JSON logs with full req & res
export const requestsLogStream = createStream(generator, {
  interval: "1d",
  path: logDirectory,
  maxFiles: 14,
});

// In-memory circular buffer for fast dashboard queries (keeps latest 1000 requests)
const MAX_BUFFER_SIZE = 1000;
const memoryLogs = [];

/**
 * Adds a log entry to in-memory buffer and appends to daily rotating file
 * @param {Object} entry
 */
export const addLog = (entry) => {
  memoryLogs.unshift(entry);
  if (memoryLogs.length > MAX_BUFFER_SIZE) {
    memoryLogs.pop();
  }

  try {
    requestsLogStream.write(JSON.stringify(entry) + "\n");
  } catch (err) {
    console.error("Failed to write to requestsLogStream:", err);
  }
};

/**
 * Returns available log dates from disk files
 */
export const getAvailableLogDates = async () => {
  try {
    if (!fs.existsSync(logDirectory)) return [];
    const files = await fs.promises.readdir(logDirectory);
    const datePattern = /^requests-(\d{4}-\d{2}-\d{2})\.log$/;
    const dates = [];
    for (const file of files) {
      const match = file.match(datePattern);
      if (match) {
        dates.push(match[1]);
      }
    }
    dates.sort((a, b) => b.localeCompare(a));
    return dates;
  } catch (err) {
    console.error("Error reading log dates:", err);
    return [];
  }
};

/**
 * Reads and parses all logs from a specific date's disk log file
 * @param {string} date YYYY-MM-DD
 */
export const readLogsFromFile = async (date) => {
  const filePath = path.join(logDirectory, `requests-${date}.log`);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const logs = [];
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        logs.unshift(JSON.parse(line));
      } catch (err) {
        // Skip malformed line
      }
    }
  }

  return logs;
};

/**
 * Returns filtered and paginated logs along with aggregate stats.
 * Supports querying live memory buffer or any historical log file by date.
 */
export const getLogs = async ({
  date = "live",
  method = "",
  status = "",
  userId = "",
  instituteId = "",
  universityId = "",
  email = "",
  endpoint = "",
  minDuration,
  maxDuration,
  ip = "",
  isAuth,
  page = 1,
  limit = 50,
} = {}) => {
  let sourceLogs;

  if (date && date !== "live") {
    sourceLogs = await readLogsFromFile(date);
  } else {
    sourceLogs = memoryLogs;
  }

  let filtered = sourceLogs;

  // 1. HTTP Method filter
  if (method && method.toUpperCase() !== "ALL") {
    const targetMethod = method.toUpperCase();
    filtered = filtered.filter((log) => log.method === targetMethod);
  }

  // 2. Status code filter (e.g. 2xx, 4xx, 5xx, or exact code 401, 500)
  if (status && status.toUpperCase() !== "ALL") {
    if (status.endsWith("xx")) {
      const codePrefix = status[0];
      filtered = filtered.filter((log) => String(log.statusCode).startsWith(codePrefix));
    } else {
      const targetStatus = Number(status);
      filtered = filtered.filter((log) => log.statusCode === targetStatus);
    }
  }

  // 4. User ID filter
  if (userId && String(userId).trim()) {
    const targetId = String(userId).trim();
    filtered = filtered.filter((log) => {
      const id = String(
        log.tokenBody?.userId ??
        log.tokenBody?.id ??
        log.tokenBody?.sub ??
        log.user?.userId ??
        log.user?.id ??
        log.req?.query?.userId ??
        ""
      );
      return id === targetId;
    });
  }

  // 5. Institute ID filter
  if (instituteId && String(instituteId).trim()) {
    const targetInstId = String(instituteId).trim();
    filtered = filtered.filter((log) => {
      const instId = String(
        log.tokenBody?.instituteId ??
        log.tokenBody?.defaultInstituteId ??
        log.user?.instituteId ??
        log.user?.defaultInstituteId ??
        log.req?.query?.instituteId ??
        log.req?.body?.instituteId ??
        log.req?.headers?.["x-institute-id"] ??
        ""
      );
      return instId === targetInstId;
    });
  }

  // 6. University ID filter
  if (universityId && String(universityId).trim()) {
    const targetUnivId = String(universityId).trim();
    filtered = filtered.filter((log) => {
      const univId = String(
        log.tokenBody?.universityId ??
        log.tokenBody?.defaultUniversityId ??
        log.user?.universityId ??
        log.user?.defaultUniversityId ??
        log.req?.query?.universityId ??
        log.req?.body?.universityId ??
        log.req?.headers?.["x-university-id"] ??
        ""
      );
      return univId === targetUnivId;
    });
  }

  // 5. User Email filter
  if (email && email.trim()) {
    const targetEmail = email.trim().toLowerCase();
    filtered = filtered.filter((log) => {
      const logEmail = (log.tokenBody?.email || log.user?.email || "").toLowerCase();
      return logEmail.includes(targetEmail);
    });
  }

  // 6. Endpoint / Path filter
  if (endpoint && endpoint.trim()) {
    const targetPath = endpoint.trim().toLowerCase();
    filtered = filtered.filter((log) => {
      const p = (log.path || "").toLowerCase();
      const u = (log.url || "").toLowerCase();
      return p.includes(targetPath) || u.includes(targetPath);
    });
  }

  // 7. Latency range filter
  if (minDuration !== undefined && minDuration !== "") {
    const minMs = Number(minDuration);
    if (!isNaN(minMs)) {
      filtered = filtered.filter((log) => (log.durationMs || 0) >= minMs);
    }
  }
  if (maxDuration !== undefined && maxDuration !== "") {
    const maxMs = Number(maxDuration);
    if (!isNaN(maxMs)) {
      filtered = filtered.filter((log) => (log.durationMs || 0) <= maxMs);
    }
  }

  // 8. Client IP filter
  if (ip && ip.trim()) {
    const targetIp = ip.trim();
    filtered = filtered.filter((log) => (log.ip || "").includes(targetIp));
  }

  // 9. Authenticated vs Public traffic filter
  if (isAuth !== undefined && isAuth !== "" && isAuth !== "ALL") {
    const requireAuth = isAuth === "true" || isAuth === true;
    filtered = filtered.filter((log) => {
      const hasAuth = Boolean(log.tokenBody || log.user);
      return requireAuth ? hasAuth : !hasAuth;
    });
  }


  // Calculate statistics across current filtered set
  const stats = {
    total: filtered.length,
    unfilteredTotal: sourceLogs.length,
    filteredTotal: filtered.length,
    count2xx: filtered.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length,
    count3xx: filtered.filter((l) => l.statusCode >= 300 && l.statusCode < 400).length,
    count4xx: filtered.filter((l) => l.statusCode >= 400 && l.statusCode < 500).length,
    count5xx: filtered.filter((l) => l.statusCode >= 500).length,
    slowRequests: filtered.filter((l) => (l.durationMs || 0) >= 500).length,
    avgDuration:
      filtered.length > 0
        ? Math.round(
            (filtered.reduce((acc, l) => acc + (l.durationMs || 0), 0) / filtered.length) * 10
          ) / 10
        : 0,
  };

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(1000, Math.max(1, parseInt(limit, 10) || 50));
  const startIndex = (parsedPage - 1) * parsedLimit;
  const paginatedLogs = filtered.slice(startIndex, startIndex + parsedLimit);

  // Return only summary metadata for table view to minimize payload size and backend load
  const summarizedLogs = paginatedLogs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp,
    method: log.method,
    url: log.url,
    path: log.path,
    statusCode: log.statusCode,
    statusMessage: log.statusMessage,
    durationMs: log.durationMs,
    ip: log.ip,
    tokenBody: log.tokenBody || null,
    user: log.user,
    hasReqBody: Boolean(log.req?.body && (typeof log.req.body === "object" ? Object.keys(log.req.body).length > 0 : true)),
    hasResBody: Boolean(log.res?.body),
  }));

  return {
    success: true,
    source: date && date !== "live" ? `file:${date}` : "memory",
    date: date || "live",
    stats,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.ceil(filtered.length / parsedLimit) || 1,
    totalRecords: filtered.length,
    logs: summarizedLogs,
  };
};

/**
 * Returns a specific log entry by ID with full req and res details
 * Searches memory first, then disk archives if needed
 * @param {string} id
 * @param {string} date
 */
export const getLogById = async (id, date = "live") => {
  // 1. Search memory buffer first
  const memoryLog = memoryLogs.find((l) => l.id === id);
  if (memoryLog) return memoryLog;

  // 2. If looking at a specific historical date file
  if (date && date !== "live") {
    const fileLogs = await readLogsFromFile(date);
    const found = fileLogs.find((l) => l.id === id);
    if (found) return found;
  }

  // 3. Fallback: search available date files on disk
  const dates = await getAvailableLogDates();
  for (const d of dates) {
    if (d === date) continue;
    const fileLogs = await readLogsFromFile(d);
    const found = fileLogs.find((l) => l.id === id);
    if (found) return found;
  }

  return null;
};

/**
 * Clears the in-memory buffer
 */
export const clearLogs = () => {
  memoryLogs.length = 0;
  return { success: true, message: "In-memory logs cleared" };
};
