export const ROLES = {
    ADMIN: "ADMIN",
    CLIENT_ADMIN: "CLIENT_ADMIN",
    TEACHER: "TEACHER",
    STUDENT: "STUDENT",
};

export const SYSTEM_ROLE_CODES = {
    CLIENT_ADMIN: "SYS_CLIENT_ADMIN",
    TEACHER: "SYS_TEACHER",
    STUDENT: "SYS_STUDENT",
};

export const SYSTEM_ROLES = ["CLIENT_ADMIN", "ADMIN", "TEACHER", "STUDENT"];

/**
 * Checks whether a role or role name represents a permanent system role.
 * Matches if:
 * 1. Object with non-empty `code`
 * 2. Role name matches a known system role (CLIENT_ADMIN, ADMIN, TEACHER, STUDENT)
 *
 * @param {object|string} role - The role object or role name string
 * @returns {boolean}
 */
export function isSystemRole(role) {
    if (!role) return false;
    if (typeof role === "object") {
        if (role.code) return true;
        const name = String(role.role || "").trim().toUpperCase().replace(/\s+/g, "_");
        return SYSTEM_ROLES.includes(name);
    }
    const name = String(role || "").trim().toUpperCase().replace(/\s+/g, "_");
    return SYSTEM_ROLES.includes(name);
}

