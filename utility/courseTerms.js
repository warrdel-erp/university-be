/**
 * Program term helpers derived from course metadata (replaces semester table reads).
 */
export function normalizeTermType(termType) {
  const raw = String(termType ?? '').trim();
  return raw || 'Semester';
}

export function buildTermName(termType, term) {
  return `${normalizeTermType(termType)} ${Number(term)}`;
}

export function buildCourseTermOptions(course) {
  const totalTerms = resolveTotalTerms(course);
  const termType = normalizeTermType(course?.termType);
  const courseId = course?.courseId ?? null;

  return Array.from({ length: totalTerms }, (_, index) => {
    const term = index + 1;
    return {
      term,
      termName: buildTermName(termType, term),
      name: buildTermName(termType, term),
      courseId,
    };
  });
}

/** Months per program term from course termType (Sem, Tri, Quar, Year, or full names). */
export function monthsPerTermFromTermType(termType) {
  const normalized = String(termType ?? '').trim().toLowerCase();
  if (normalized.startsWith('year') || normalized === 'yearly') return 12;
  if (normalized.startsWith('sem') || normalized === 'semester') return 6;
  if (normalized.startsWith('tri') || normalized === 'trimester') return 4;
  if (normalized.startsWith('quar') || normalized === 'quarterly') return 3;
  return 6;
}

/** Terms created per program year: yearly=1, semester=2, trimester=3, quarterly=4. */
export function termsPerYearFromTermType(termType) {
  return Math.max(1, Math.floor(12 / monthsPerTermFromTermType(termType)));
}

export function termsPerYear(course) {
  const termType = course?.termType;
  if (termType != null && String(termType).trim() !== '') {
    return termsPerYearFromTermType(termType);
  }

  const totalTerms = Number(course?.totalTerms) || 0;
  const courseDuration = Number(course?.courseDuration) || 1;
  if (!totalTerms || !courseDuration) return 1;
  return Math.max(1, Math.ceil(totalTerms / courseDuration));
}

export function resolveTotalTerms(course) {
  const stored = Number(course?.totalTerms) || 0;
  if (stored > 0) {
    return stored;
  }

  const courseDuration = Number(course?.courseDuration) || 0;
  if (courseDuration > 0) {
    return termsPerYear(course) * courseDuration;
  }

  return 0;
}

export function yearFromTerm(term, course) {
  const perYear = termsPerYear(course);
  return Math.ceil(Number(term) / perYear);
}

/** Program term numbers that belong to a given program year (1-based). */
export function termsForYear(year, course) {
  const perYear = termsPerYear(course);
  const totalTerms = resolveTotalTerms(course);
  const yearNum = Number(year);
  if (!yearNum || yearNum < 1 || !totalTerms) {
    return [];
  }

  const startTerm = (yearNum - 1) * perYear + 1;
  const endTerm = Math.min(yearNum * perYear, totalTerms);
  const result = [];
  for (let term = startTerm; term <= endTerm; term++) {
    result.push(term);
  }
  return result;
}
