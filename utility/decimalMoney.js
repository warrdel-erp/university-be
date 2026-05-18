import Decimal from "decimal.js";

/**
 * Add two numbers with 2 decimal places
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function decimalAdd(a, b) {
  return new Decimal(a).plus(b).toDP(2).toNumber();
}

/**
 * Subtract two numbers with 2 decimal places
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function decimalSubtract(a, b) {
  return new Decimal(a).minus(b).toDP(2).toNumber();
}

/**
 * Multiply two numbers with 2 decimal places
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function decimalMultiply(a, b) {
  return new Decimal(a).times(b).toDP(2).toNumber();
}

/**
 * Divide two numbers with 2 decimal places
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function decimalDivide(a, b) {
  if (b === 0) throw new Error("Division by zero");
  return new Decimal(a).dividedBy(b).toDP(2).toNumber();
}

/**
 * Calculate sum of an array of numbers with 2 decimal places
 * @param {number[]} numbers
 * @returns {number}
 */
export function decimalSum(numbers) {
  return numbers.reduce((sum, num) => decimalAdd(sum, num), 0);
}

/**
 * Compare two numbers — returns -1 if a < b, 0 if a === b, 1 if a > b
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function decimalCompare(a, b) {
  return new Decimal(a).comparedTo(b);
}

/** @param {number} a @param {number} b @returns {boolean} */
export function decimalGreaterThan(a, b) {
  return decimalCompare(a, b) > 0;
}

/** @param {number} a @param {number} b @returns {boolean} */
export function decimalGreaterThanOrEqual(a, b) {
  return decimalCompare(a, b) >= 0;
}

/** @param {number} a @param {number} b @returns {boolean} */
export function decimalLessThan(a, b) {
  return decimalCompare(a, b) < 0;
}

/** @param {number} a @param {number} b @returns {boolean} */
export function decimalLessThanOrEqual(a, b) {
  return decimalCompare(a, b) <= 0;
}

/**
 * Get the minimum of two numbers with 2 decimal places
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function decimalMin(a, b) {
  const min = decimalLessThan(a, b) ? a : b;
  return new Decimal(min).toDP(2).toNumber();
}

/**
 * Get the maximum of two numbers with 2 decimal places
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function decimalMax(a, b) {
  const max = decimalGreaterThan(a, b) ? a : b;
  return new Decimal(max).toDP(2).toNumber();
}

/**
 * Coerce a DB / API money value to a number at 2 decimal places; invalid → 0
 * @param {unknown} value
 * @returns {number}
 */
export function toMoneyNumber(value) {
  if (value == null || value === "") return 0;
  try {
    const d = new Decimal(value);
    if (!d.isFinite()) return 0;
    return d.toDP(2).toNumber();
  } catch {
    return 0;
  }
}

/**
 * Parse money from request body: empty → null, invalid → NaN, else 2 DP number
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseMoneyInput(value) {
  if (value === undefined || value === null || value === "") return null;
  try {
    const d = new Decimal(value);
    if (!d.isFinite()) return Number.NaN;
    return d.toDP(2).toNumber();
  } catch {
    return Number.NaN;
  }
}
