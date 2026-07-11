import * as model from '../models/index.js';
import { termsForYear } from './courseTerms.js';

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
    classSectionTermId,
    sectionWhere,
    sectionRequired = false,
    termRequired = false,
    termAttributes,
    sectionAttributes,
    /** When false, only studentClassSectionTerm → classSection (placement via class_section_term). */
    includeSectionTerms = true,
} = {}) {
    const termWhere = {};
    if (classSectionTermId != null && Number.isFinite(Number(classSectionTermId))) {
        termWhere.classSectionTermId = Number(classSectionTermId);
    }
    if (term != null && Number.isFinite(Number(term))) {
        termWhere.term = Number(term);
    }
    if (classSectionsId != null && Number.isFinite(Number(classSectionsId))) {
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
            ...(includeSectionTerms && {
                include: [classSectionTermsInclude({ term })],
            }),
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

/** Timetable routine → class_section_term → class_sections */
export function timeTableRoutineClassSectionInclude({
    sectionAttributes,
    sectionWhere,
    sectionRequired = false,
    termRequired = false,
    termAttributes,
    sectionNestedIncludes,
} = {}) {
    const include = {
        model: model.classSectionTermModel,
        as: 'timeTableClassSectionTerm',
        required: termRequired,
    };
    if (termAttributes) {
        include.attributes = termAttributes;
    }
    const sectionInclude = {
        model: model.classSectionModel,
        as: 'classSection',
        required: sectionRequired,
    };
    if (sectionAttributes) {
        sectionInclude.attributes = sectionAttributes;
    }
    if (sectionWhere) {
        sectionInclude.where = sectionWhere;
    }
    if (sectionNestedIncludes?.length) {
        sectionInclude.include = sectionNestedIncludes;
    }
    include.include = [sectionInclude];
    return include;
}

export function resolveTimeTableRoutineSection(routine) {
    if (!routine) return null;
    const plain = routine.get ? routine.get({ plain: true }) : routine;
    if (plain.timeTableClassSectionTerm?.classSection) {
        return plain.timeTableClassSectionTerm.classSection;
    }
    return plain.timeTableClassSection ?? null;
}

export function stripRoutinePersistPayload(data) {
    if (!data || typeof data !== 'object') return data;
    const { classSectionsId, classSectionId, term, ...rest } = data;
    return rest;
}

/** Resolve class_sections_id from student row. */
export function resolveStudentClassSectionsId(plain) {
    const section = resolveStudentSection(plain);
    return section?.classSectionsId ?? plain.studentClassSectionTerm?.classSectionsId ?? null;
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

/** Program year from class_sections.year. */
export function resolveProgramYear(sectionPlain) {
    if (sectionPlain?.year != null) return Number(sectionPlain.year);

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

/** Lean placement row for term-grouped list APIs (parent carries courseId/sessionId). */
export function formatClassSectionTermPlacement(sectionPlain, termRow) {
    const row = {
        classSectionTermId: termRow.classSectionTermId,
        classSectionsId: sectionPlain.classSectionsId,
        section: sectionPlain.section,
        year: sectionPlain.year,
    };
    if (sectionPlain.specializationId != null) {
        row.specializationId = sectionPlain.specializationId;
    }
    return row;
}

/** Group class sections by program term using class_section_term rows and program year. */
export function groupClassSectionsByTerm(sectionPlains, course = null) {
    const byTerm = {};

    for (const cs of sectionPlains) {
        const termRows = cs.classSectionTerms ?? [];
        const termRowByNum = {};

        for (const termRow of termRows) {
            const termNum = Number(termRow.term);
            if (termNum) {
                termRowByNum[termNum] = termRow;
            }
        }

        let termNumbers = Object.keys(termRowByNum).map(Number);

        if (course && cs.year != null) {
            const yearTerms = termsForYear(Number(cs.year), course);
            if (yearTerms.length) {
                termNumbers = yearTerms;
            }
        }

        if (!termNumbers.length) {
            const fallbackTerm = resolveProgramTerm(cs);
            if (fallbackTerm == null) {
                continue;
            }
            termNumbers = [Number(fallbackTerm)];
        }

        for (const termNum of termNumbers) {
            const termRow = termRowByNum[termNum] ?? {
                classSectionTermId: resolveClassSectionTermId(cs, termNum),
                term: termNum,
                classSectionsId: cs.classSectionsId,
            };

            if (!byTerm[termNum]) {
                byTerm[termNum] = [];
            }

            byTerm[termNum].push(formatClassSectionTermPlacement(cs, termRow));
        }
    }

    return byTerm;
}
