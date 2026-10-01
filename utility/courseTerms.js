/**
 * Program term helpers derived from course metadata (replaces semester table reads).
 */
import {
  decimalAdd,
  decimalDivide,
  decimalGreaterThan,
  decimalMax,
  decimalMin,
  decimalMultiply,
  decimalSubtract,
  toMoneyNumber,
} from './decimalMoney.js';

export function normalizeTermType(termType) {
  const raw = String(termType ?? '').trim();
  return raw || 'Semester';
}

export function buildTermName(termType, term) {
  return `${normalizeTermType(termType)} ${toMoneyNumber(term)}`;
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
  return decimalMax(1, Math.floor(decimalDivide(12, monthsPerTermFromTermType(termType))));
}

export function termsPerYear(course) {
  const termType = course?.termType;
  if (termType != null && String(termType).trim() !== '') {
    return termsPerYearFromTermType(termType);
  }

  const totalTerms = toMoneyNumber(course?.totalTerms);
  const courseDuration = toMoneyNumber(course?.courseDuration) || 1;
  if (!totalTerms || !courseDuration) return 1;
  return decimalMax(1, Math.ceil(decimalDivide(totalTerms, courseDuration)));
}

export function resolveTotalTerms(course) {
  const stored = toMoneyNumber(course?.totalTerms);
  if (decimalGreaterThan(stored, 0)) {
    return stored;
  }

  const courseDuration = toMoneyNumber(course?.courseDuration);
  if (decimalGreaterThan(courseDuration, 0)) {
    return decimalMultiply(termsPerYear(course), courseDuration);
  }

  return 0;
}

export function yearFromTerm(term, course) {
  const perYear = termsPerYear(course);
  return Math.ceil(decimalDivide(toMoneyNumber(term), perYear));
}

/** Program term numbers that belong to a given program year (1-based). */
export function termsForYear(year, course) {
  const perYear = termsPerYear(course);
  const totalTerms = resolveTotalTerms(course);
  const yearNum = toMoneyNumber(year);
  if (!yearNum || yearNum < 1 || !totalTerms) {
    return [];
  }

  const startTerm = decimalAdd(decimalMultiply(decimalSubtract(yearNum, 1), perYear), 1);
  const endTerm = decimalMin(decimalMultiply(yearNum, perYear), totalTerms);
  const result = [];
  for (let term = startTerm; term <= endTerm; term++) {
    result.push(term);
  }
  return result;
}

export function buildCurrentTermsForYear(course, yearNumber) {
  const currentTerms = [];
  for (const term of termsForYear(yearNumber, course)) {
    currentTerms.push({
      term,
      termName: buildTermName(course?.termType, term),
    });
  }
  return currentTerms;
}

export function buildCurrentTermsLabel(currentTerms) {
  if (!currentTerms || !currentTerms.length) {
    return null;
  }
  if (currentTerms.length === 1) {
    return currentTerms[0].termName;
  }
  return `${currentTerms[0].termName} - ${currentTerms[currentTerms.length - 1].termName}`;
}

export function buildCurrentPositionLabel(currentTerms, yearNumber) {
  if (!currentTerms || !currentTerms.length) {
    return `Year ${yearNumber}`;
  }
  if (currentTerms.length === 1) {
    return `${currentTerms[0].termName} · Year ${yearNumber}`;
  }
  return `${currentTerms[0].termName} – ${currentTerms[currentTerms.length - 1].termName} · Year ${yearNumber}`;
}

export function resolveBatchCurrentPosition({ batchYear, course, activeCalendarYear }) {
  const duration = Number(course?.courseDuration) || 0;
  const year = Number(batchYear);
  const activeYear = Number(activeCalendarYear);
  if (!year || !activeYear) {
    return {
      currentYear: null,
      currentYearLabel: null,
      currentTerms: [],
      currentTermsLabel: null,
      currentPositionLabel: null,
    };
  }
  const currentYear = activeYear - year + 1;
  const inRange = currentYear >= 1 && currentYear <= duration;
  const currentTerms = inRange ? buildCurrentTermsForYear(course, currentYear) : [];
  const currentTermsLabel = inRange ? buildCurrentTermsLabel(currentTerms) : null;
  const currentPositionLabel = inRange
    ? buildCurrentPositionLabel(currentTerms, currentYear)
    : null;

  return {
    currentYear: inRange ? currentYear : null,
    currentYearLabel: inRange ? `Year ${currentYear}` : null,
    currentTerms,
    currentTermsLabel,
    currentPositionLabel,
  };
}
