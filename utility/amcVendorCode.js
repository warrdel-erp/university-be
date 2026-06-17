const VENDOR_SLUG_LEN = 4;

export function normalizeVendorName(vendorName) {
  return vendorName.trim();
}

function normalizeWords(vendorName) {
  return vendorName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word);
}

export function sanitizeCategoryPrefix(categoryPrefix) {
  return String(categoryPrefix)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

/** 4-letter slug from a single word (Excel → EXCE, Dell → DELL). */
export function toFourLetterSlug(word) {
  const letters = String(word).replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (!letters) {
    return "VNDX";
  }
  return letters.slice(0, VENDOR_SLUG_LEN).padEnd(VENDOR_SLUG_LEN, "X");
}

/** First word slug, then second word slug if present (max 2 attempts). */
export function deriveVendorSlugCandidates(vendorName) {
  const words = normalizeWords(vendorName);
  if (!words.length) {
    return ["VNDX"];
  }

  const candidates = [toFourLetterSlug(words[0])];

  if (words[1]) {
    const secondSlug = toFourLetterSlug(words[1]);
    if (secondSlug !== candidates[0]) {
      candidates.push(secondSlug);
    }
  }

  return candidates;
}

export function formatRegistrationYear(registrationYear) {
  return String(Number(registrationYear)).slice(-2);
}

/** Vendor code: {category}{4-letter-slug}{2-digit-year} e.g. ITEXCE26 */
export function buildVendorCodeFromSlug(categoryPrefix, slug, registrationYear) {
  const category = sanitizeCategoryPrefix(categoryPrefix);
  const year = formatRegistrationYear(registrationYear);
  return `${category}${toFourLetterSlug(slug)}${year}`;
}
