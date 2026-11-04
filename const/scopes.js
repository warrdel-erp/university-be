export const SCOPES = {
    DEPARTMENT: 'DEPARTMENT',
    INSTITUTE: 'INSTITUTE',
    CAMPUS: 'CAMPUS',
    UNIVERSITY: 'UNIVERSITY',
    MY: 'MY',
};

// For validation (zod, etc.)
export const VALID_SCOPES = Object.values(SCOPES);

// Organizational hierarchy: lowest -> highest
// A role of a given scope can use permissions of that scope or below.
export const SCOPE_ORDER = [
    SCOPES.DEPARTMENT,
    SCOPES.INSTITUTE,
    SCOPES.CAMPUS,
    SCOPES.UNIVERSITY,
];

export const scopeRank = (scope) => SCOPE_ORDER.indexOf(scope);
