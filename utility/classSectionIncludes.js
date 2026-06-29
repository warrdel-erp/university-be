import * as model from '../models/index.js';

/**
 * Standard include for class_section_term rows on a class section.
 * @param {{ term?: number, required?: boolean }} options
 */
export function classSectionTermsInclude({ term, required = false } = {}) {
    const termNum = term != null ? Number(term) : null;
    return {
        model: model.classSectionTermModel,
        as: 'classSectionTerms',
        attributes: ['classSectionTermId', 'term'],
        required: Boolean(required && termNum != null),
        ...(termNum != null && { where: { term: termNum } }),
    };
}

/**
 * Student placement: class_section_term → class_sections (replaces direct students.class_sections_id).
 * @param {{
 *   term?: number,
 *   classSectionsId?: number,
 *   sectionWhere?: object,
 *   sectionRequired?: boolean,
 *   termRequired?: boolean,
 *   termAttributes?: string[] | object,
 *   sectionAttributes?: string[] | object,
 * }} options
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
    const termWhere = {
        ...(term != null && { term: Number(term) }),
        ...(classSectionsId != null && { classSectionsId: Number(classSectionsId) }),
    };
    const hasTermWhere = Object.keys(termWhere).length > 0;

    return {
        model: model.classSectionTermModel,
        as: 'studentClassSectionTerm',
        attributes: termAttributes ?? ['classSectionTermId', 'term', 'classSectionsId'],
        required: termRequired,
        ...(hasTermWhere && { where: termWhere }),
        include: [{
            model: model.classSectionModel,
            as: 'classSection',
            attributes: sectionAttributes ?? {
                exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
            },
            required: sectionRequired,
            ...(sectionWhere && { where: sectionWhere }),
            include: [classSectionTermsInclude({ term })],
        }],
    };
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
    return {
        model: model.classSectionModel,
        as: 'classSection',
        ...(attributes && { attributes }),
        include: [classSectionTermsInclude({ term, required })],
    };
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
        const match = terms.find((row) => Number(row.term) === Number(term));
        return match?.classSectionTermId ?? null;
    }
    return terms[0]?.classSectionTermId ?? null;
}

export function yearLabel(year) {
    return year != null ? `Year ${year}` : null;
}
