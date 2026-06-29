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
  const totalTerms = Number(course?.totalTerms) || 0;
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

export function termsPerYear(course) {
  const totalTerms = Number(course?.totalTerms) || 0;
  const courseDuration = Number(course?.courseDuration) || 1;
  if (!totalTerms || !courseDuration) return 1;
  return Math.max(1, Math.ceil(totalTerms / courseDuration));
}

export function yearFromTerm(term, course) {
  const perYear = termsPerYear(course);
  return Math.ceil(Number(term) / perYear);
}
