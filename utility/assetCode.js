const ASSET_CODE_SEQUENCE_PAD = 3;
const INVENTORY_COPY_PAD = 4;
const MIN_ASSET_CODE_SEQUENCE = 1;

/** Default prefixes for seeded asset category names. */
export const CATEGORY_CODE_PREFIX_BY_NAME = {
  "Land & Buildings": "LDB",
  "Furniture & Fixtures": "FURN",
  "IT Assets": "IT",
  "Software & Licenses": "SWL",
  "Office Equipment": "AV",
  Vehicles: "VEH",
  "Plant & Machinery": "PLM",
  "Electrical & Utility Equipment": "ELE",
  "Tools & Instruments": "LIB",
  "Security Equipment": "SEC",
  "Other Equipment": "OTH",
  "Intangible Assets": "INT",
};

export function normalizeCategoryCodePrefix(prefix) {
  return String(prefix)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

/** Fallback prefix when creating a custom asset category (no code_prefix supplied). */
export function deriveCategoryCodePrefix(categoryName) {
  const words = categoryName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s&]/g, " ")
    .split(/\s+/)
    .filter((word) => word && word !== "&");

  if (!words.length) {
    return "GEN";
  }

  if (words.length === 1) {
    return words[0].slice(0, 4);
  }

  return words.map((word) => word[0]).join("").slice(0, 4);
}

export function codePrefixForCategoryName(categoryName) {
  return (
    CATEGORY_CODE_PREFIX_BY_NAME[categoryName] ??
    deriveCategoryCodePrefix(categoryName)
  );
}

/** 3-letter slug from asset name (e.g. Table → TBL, Dell Laptop → DLL). */
export function deriveAssetNameCodePrefix(assetName) {
  const words = assetName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word);

  if (!words.length) {
    return "AST";
  }

  const consonantsFrom = (text) => text.replace(/[AEIOU]/g, "");
  const lettersFrom = (text) => text.replace(/[^A-Z]/g, "");

  const toThree = (primary, fallback) => {
    const merged = `${primary}${fallback}`;
    return merged.slice(0, 3).padEnd(3, "X");
  };

  if (words.length === 1) {
    return toThree(consonantsFrom(words[0]), lettersFrom(words[0]));
  }

  const initials = words.map((word) => word[0]).join("");
  const allConsonants = consonantsFrom(words.join(""));

  return toThree(initials, allConsonants);
}

export function normalizeAssetNameCodePrefix(assetNamePrefix) {
  return String(assetNamePrefix)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches asset codes for one category + name slug (e.g. FURN-TBL001). */
export function assetMasterCodePattern(categoryPrefix, assetNamePrefix) {
  const category = normalizeCategoryCodePrefix(categoryPrefix);
  const name = normalizeAssetNameCodePrefix(assetNamePrefix);
  return new RegExp(`^${escapeRegex(category)}-${escapeRegex(name)}(\\d{3})$`);
}

/** Asset master code: FURN-TBL001 (category + name slug + per-name sequence). */
export function formatAssetCode(categoryPrefix, assetNamePrefix, sequence) {
  const category = normalizeCategoryCodePrefix(categoryPrefix);
  const name = normalizeAssetNameCodePrefix(assetNamePrefix);
  return `${category}-${name}${String(sequence).padStart(ASSET_CODE_SEQUENCE_PAD, "0")}`;
}

/** Trailing 3-digit sequence (FURN-TBL001, legacy IT-001, IT-DEL-001). */
export function parseAssetCodeTrailingSequence(code) {
  const match = /(\d{3})$/.exec(code);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

export function parseAssetCodeSequenceForNameSlug(code, categoryPrefix, assetNamePrefix) {
  const match = assetMasterCodePattern(categoryPrefix, assetNamePrefix).exec(code);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

export function nextAssetCodeSequenceFromMax(maxSeq) {
  return Math.max(MIN_ASSET_CODE_SEQUENCE, maxSeq + 1);
}

/** Inventory copy: IT-001-0001 */
export function formatInventoryItemCode(assetCode, copyNumber) {
  return `${assetCode}-${String(copyNumber).padStart(INVENTORY_COPY_PAD, "0")}`;
}

export function parseInventoryItemCopyNumber(inventoryCode, assetCode) {
  const escapedAssetCode = assetCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^${escapedAssetCode}-(\\d+)$`).exec(inventoryCode);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}
