import { PERMISSIONS } from '../const/permissions.js';
import { policies } from '../policies/index.js';

// Helper to traverse hierarchy
const getPossibleScopes = (permValue) => {
    const permObj = PERMISSIONS[permValue];
    if (permObj?.possibleScopes) return permObj.possibleScopes;

    let currentPerm = permObj;
    while (currentPerm?.parentPermission) {
        currentPerm = PERMISSIONS[currentPerm.parentPermission];
        if (currentPerm?.possibleScopes) {
            return currentPerm.possibleScopes;
        }
    }
    return null;
};

// Helper to traverse hierarchy for resource
const getResource = (permValue) => {
    const permObj = PERMISSIONS[permValue];
    if (permObj?.resource) return permObj.resource;

    let currentPerm = permObj;
    while (currentPerm?.parentPermission) {
        currentPerm = PERMISSIONS[currentPerm.parentPermission];
        if (currentPerm?.resource) {
            return currentPerm.resource;
        }
    }
    return null;
};


/**
 * Loads a resource-specific policy to compute the database filter (where clause).
 *
 * @param {string} scope - The resolved scope (e.g. 'INSTITUTE')
 * @param {Array|string} targets - Array of allowed resource IDs, or 'ALL'
 * @param {object} user - The user object
 * @param {string} permissionKey - The permission key requested
 * @returns {Promise<Object|null>} - Returns the filter object, or null to fallback to legacy logic
 */
export function getPolicyFilter(scope, targets, user, permissionKey) {
    const resource = getResource(permissionKey);
    if (!resource) return null;

    // Validate scope against PERMISSIONS definition
    const allowedScopes = getPossibleScopes(permissionKey);
    if (allowedScopes && Array.isArray(allowedScopes)) {
        if (!allowedScopes.includes(scope)) {
            console.warn(`[PolicyEngine] Scope ${scope} is not permitted for permission ${permissionKey}`);
            return { id: -1 }; // Deny access
        }
    }

    const policyFn = policies[resource];

    if (policyFn) {
        try {
            return policyFn(user, scope, targets);
        } catch (error) {
            console.error(`[PolicyEngine] Error executing policy for resource ${resource}:`, error);
        }
    }

    return null; // Fallback to legacy logic in authEngine if no policy exists
}
