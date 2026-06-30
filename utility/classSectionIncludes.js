import * as model from '../models/index.js';

/**
 * Standard include for class_section_term rows on a class section.
 * @param {{ term?: number, required?: boolean }} options
 */
export function classSectionTermsInclude({ term, required = false } = {}) {
    const termNum = term != null ? Number(term) : null;

    const include = {
        model: model.classSectionTermModel,
        as: 'classSectionTerms',
        attributes: ['classSectionTermId', 'term', 'classSectionsId'],
        required: Boolean(required && termNum != null),
    };

    if (termNum != null) {
        include.where = { term: termNum };
    }

    return include;
}

/**
 * Student placement: class_section_term → class_sections (replaces direct students.class_sections_id).
 */
export function studentClassSectionTermWithSectionInclude({
    term,
    classSectionsId,
    sectionWhere,
    sectionRequired = false,
    termRequired = false,
    termAttributes,
    sectionAttributes,
} = {}) {
    const termWhere = {};
    if (term != null) {
        termWhere.term = Number(term);
    }
    if (classSectionsId != null) {
        termWhere.classSectionsId = Number(classSectionsId);
    }

    const include = {
        model: model.classSectionTermModel,
        as: 'studentClassSectionTerm',
        attributes: termAttributes ?? ['classSectionTermId', 'term', 'classSectionsId'],
        required: termRequired,
        include: [{
            model: model.classSectionModel,
            as: 'classSection',
            attributes: sectionAttributes ?? {
                exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
            },
            required: sectionRequired,
            include: [classSectionTermsInclude({ term })],
        }],
    };

    if (Object.keys(termWhere).length > 0) {
        include.where = termWhere;
    }
    if (sectionWhere) {
        include.include[0].where = sectionWhere;
    }

    return include;
}

/** Resolve class section from student row (supports legacy studentSections alias). */
export function resolveStudentSection(plain) {
    if (!plain) return null;
    if (plain.studentSections) return plain.studentSections;
    return plain.studentClassSectionTerm?.classSection ?? null;
}

/** Resolve class_sections_id from student row. */
export function resolveStudentClassSectionsId(plain) {
    const section = resolveStudentSection(plain);
    return section?.classSectionsId ?? plain.studentClassSectionTerm?.classSectionsId ?? null;
}

export function studentSectionsWithTermsInclude({ term } = {}) {
    return studentClassSectionTermWithSectionInclude({ term });
}

export function classSectionWithTermsInclude({ term, required = false, attributes } = {}) {
    const include = {
        model: model.classSectionModel,
        as: 'classSection',
        include: [classSectionTermsInclude({ term, required })],
    };
    if (attributes) {
        include.attributes = attributes;
    }
    return include;
}

/** Program term from joined classSectionTerms (first match or filtered term). */
export function resolveProgramTerm(sectionPlain, preferredTerm = null) {
    if (preferredTerm != null) return Number(preferredTerm);

    const terms = sectionPlain?.classSectionTerms ?? [];
    if (!terms.length) {
        return sectionPlain?.term ?? null;
    }

    return terms[0]?.term ?? null;
}

/** Program year from class_sections.year (fallback: legacy class string). */
export function resolveProgramYear(sectionPlain) {
    if (sectionPlain?.year != null) return Number(sectionPlain.year);

    if (sectionPlain?.class != null && sectionPlain.class !== '') {
        const n = Number(sectionPlain.class);
        return Number.isFinite(n) ? n : null;
    }

    return null;
}

export function resolveClassSectionTermId(sectionPlain, term = null) {
    const terms = sectionPlain?.classSectionTerms ?? [];
    if (!terms.length) return sectionPlain?.classSectionTermId ?? null;

    if (term != null) {
        const target = Number(term);
        for (const row of terms) {
            if (Number(row.term) === target) {
                return row.classSectionTermId ?? null;
            }
        }
        return null;
    }

    return terms[0]?.classSectionTermId ?? null;
}

export function yearLabel(year) {
    return year != null ? `Year ${year}` : null;
}

/** Lean placement row for term-grouped list APIs (parent carries courseId/sessionId). */
export function formatClassSectionTermPlacement(sectionPlain, termRow) {
    const row = {
        classSectionTermId: termRow.classSectionTermId,
        classSectionsId: sectionPlain.classSectionsId,
        sectionId: sectionPlain.sectionId,
        section: sectionPlain.section,
        year: sectionPlain.year,
    };
    if (sectionPlain.specializationId != null) {
        row.specializationId = sectionPlain.specializationId;
    }
    return row;
}

/** Group class sections by program term using all class_section_term rows. */
export function groupClassSectionsByTerm(sectionPlains) {
    const byTerm = {};

    for (const cs of sectionPlains) {
        const terms = cs.classSectionTerms ?? [];

        if (terms.length > 0) {
            for (const termRow of terms) {
                const termNum = Number(termRow.term);
                if (!termNum) continue;
                if (!byTerm[termNum]) {
                    byTerm[termNum] = [];
                }
                byTerm[termNum].push(formatClassSectionTermPlacement(cs, termRow));
            }
            continue;
        }

        const fallbackTerm = resolveProgramTerm(cs);
        if (fallbackTerm == null) continue;

        const termNum = Number(fallbackTerm);
        if (!byTerm[termNum]) {
            byTerm[termNum] = [];
        }

        const placement = formatClassSectionTermPlacement(cs, {
            classSectionTermId: resolveClassSectionTermId(cs, termNum),
            term: termNum,
            classSectionsId: cs.classSectionsId,
        });
        byTerm[termNum].push(placement);
    }

    return byTerm;
}
