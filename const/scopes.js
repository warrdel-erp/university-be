
export const SCOPES = {
    OWN: 'OWN',
    CLASS: 'CLASS',
    DEPARTMENT: 'DEPARTMENT',
    INSTITUTE: 'INSTITUTE',
    CAMPUS: 'CAMPUS',
    UNIVERSITY: 'UNIVERSITY',
};

// For validation (zod, etc.)
export const VALID_SCOPES = Object.values(SCOPES);
