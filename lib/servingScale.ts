/**
 * Serving-size scaling: ratio, ingredient/shopping lines, cooking steps, display.
 * Amounts are shown as whole numbers + vulgar fractions (no decimals).
 */

export const PRESET_SERVINGS = [1, 2, 4, 6, 8] as const;
export const SERVING_SLIDER_MIN = 1;
export const SERVING_SLIDER_MAX = 50;
export const PRESET_HIGHLIGHT_COLOR = '#FF3A2D';

/** Ratio for scaling; 1 when base servings missing or invalid. */
export function getServingScaleRatio(
  selectedServings: number,
  recipeServings: number | null | undefined
): number {
  if (recipeServings == null || recipeServings <= 0) return 1;
  if (!Number.isFinite(selectedServings) || selectedServings <= 0) return 1;
  return selectedServings / recipeServings;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function simplifyFraction(num: number, den: number): { num: number; den: number } {
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

/**
 * Best vulgar fraction for fractional part in (0, 1), with bounded denominator.
 */
function bestRationalForFractionalPart(
  f: number,
  maxDen: number
): { num: number; den: number } | null {
  if (f < 1e-9 || f >= 1 - 1e-9) return null;
  let best: { num: number; den: number; err: number } | null = null;
  for (let den = 2; den <= maxDen; den++) {
    const num = Math.round(f * den);
    if (num <= 0 || num >= den) continue;
    const err = Math.abs(f - num / den);
    if (!best || err < best.err - 1e-12) {
      best = { num, den, err };
    }
  }
  if (!best) return null;
  return simplifyFraction(best.num, best.den);
}

/**
 * Format a positive scaled amount using only integers and fractions (no decimals).
 */
export function formatScaledAmount(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const sign = value < 0 ? '-' : '';
  let v = Math.abs(value);

  if (v < 1e-9) return sign + '0';

  let whole = Math.trunc(v);
  let f = v - whole;

  if (f >= 1 - 1e-9) {
    whole += 1;
    f = 0;
  }

  if (f < 1e-9) {
    return sign + String(whole);
  }

  let rat = bestRationalForFractionalPart(f, 16);
  let err = rat ? Math.abs(f - rat.num / rat.den) : Infinity;
  if (err > 0.05) {
    const r64 = bestRationalForFractionalPart(f, 64);
    const e64 = r64 ? Math.abs(f - r64.num / r64.den) : Infinity;
    if (e64 < err) {
      rat = r64;
      err = e64;
    }
  }
  if (!rat || err > 0.08) {
    const r128 = bestRationalForFractionalPart(f, 128);
    const e128 = r128 ? Math.abs(f - r128.num / r128.den) : Infinity;
    if (r128 && e128 < err) {
      rat = r128;
      err = e128;
    }
  }
  if (!rat) {
    const den = 64;
    const num = Math.max(1, Math.min(den - 1, Math.round(f * den)));
    rat = simplifyFraction(num, den);
  }

  let { num, den } = rat;
  if (num >= den) {
    whole += Math.trunc(num / den);
    num = num % den;
    if (num === 0) return sign + String(whole);
  }

  const fracStr = `${num}/${den}`;
  if (whole === 0) return sign + fracStr;
  return sign + `${whole} ${fracStr}`;
}

export interface ParsedLeadingQuantity {
  value: number;
  endIndex: number;
}

export function parseLeadingQuantity(line: string): ParsedLeadingQuantity | null {
  const leadingWs = line.match(/^\s*/)?.[0].length ?? 0;
  const tail = line.slice(leadingWs);

  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)\b/.exec(tail);
  if (mixed) {
    const w = parseInt(mixed[1], 10);
    const n = parseInt(mixed[2], 10);
    const d = parseInt(mixed[3], 10);
    if (d === 0) return null;
    return { value: w + n / d, endIndex: leadingWs + mixed[0].length };
  }

  const fracOnly = /^(\d+)\s*\/\s*(\d+)\b/.exec(tail);
  if (fracOnly) {
    const n = parseInt(fracOnly[1], 10);
    const d = parseInt(fracOnly[2], 10);
    if (d === 0) return null;
    return { value: n / d, endIndex: leadingWs + fracOnly[0].length };
  }

  const withMetricUnit = /^(\d+(?:\.\d+)?)\s*(ml|kg|lbs|lb|oz|g)\b/i.exec(tail);
  if (withMetricUnit) {
    const val = parseFloat(withMetricUnit[1]);
    if (Number.isFinite(val)) {
      return { value: val, endIndex: leadingWs + withMetricUnit[0].length };
    }
  }

  const dec = /^(\d+\.\d+|\d+)(?=\s|$)/.exec(tail);
  if (dec) {
    const val = parseFloat(dec[1]);
    if (!Number.isFinite(val)) return null;
    return { value: val, endIndex: leadingWs + dec[0].length };
  }

  return null;
}

/** ml, g, kg, lb, oz, l — longer tokens first for alternation. */
const PAREN_UNIT_ALT = 'ml|lbs|lb|kg|oz|g|l';

const PAREN_MEASURE_RE = new RegExp(
  `\\(\\s*(\\d+(?:\\.\\d+)?)\\s*(${PAREN_UNIT_ALT})\\s*\\)`,
  'gi'
);

/**
 * Scale numeric amounts inside parentheses like (500ml), (200 g), (1.5kg).
 */
export function scaleParentheticalMeasures(line: string, ratio: number): string {
  if (ratio === 1 || !line) return line;
  return line.replace(PAREN_MEASURE_RE, (_full, numStr: string, unit: string) => {
    const n = parseFloat(numStr);
    if (!Number.isFinite(n)) return _full;
    const scaled = n * ratio;
    const head = formatScaledAmount(scaled);
    return `(${head} ${unit})`;
  });
}

export function scaleIngredientLine(line: string, ratio: number): string {
  if (ratio === 1) return line;
  let out: string;
  const parsed = parseLeadingQuantity(line);
  if (parsed) {
    const rest = line.slice(parsed.endIndex).trimStart();
    const head = formatScaledAmount(parsed.value * ratio);
    out = rest ? `${head} ${rest}` : head;
  } else {
    out = line;
  }
  return scaleParentheticalMeasures(out, ratio);
}

export function parseQuantityToken(token: string): number | null {
  const t = token.trim();
  if (!t) return null;

  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (mixed) {
    const w = parseInt(mixed[1], 10);
    const n = parseInt(mixed[2], 10);
    const d = parseInt(mixed[3], 10);
    if (d === 0) return null;
    return w + n / d;
  }

  const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (frac) {
    const n = parseInt(frac[1], 10);
    const d = parseInt(frac[2], 10);
    if (d === 0) return null;
    return n / d;
  }

  const dec = /^(\d+\.\d+|\d+)$/.exec(t);
  if (dec) {
    const v = parseFloat(dec[1]);
    return Number.isFinite(v) ? v : null;
  }

  return null;
}

const STEP_UNITS_DESC = [
  'handful',
  'liters',
  'liter',
  'inches',
  'inch',
  'slices',
  'slice',
  'strips',
  'strip',
  'pieces',
  'piece',
  'cloves',
  'clove',
  'tbsp',
  'cups',
  'cup',
  'tsp',
  'lbs',
  'lb',
  'oz',
  'kg',
  'ml',
  'g',
  'cans',
  'can',
].sort((a, b) => b.length - a.length);

const STEP_UNIT_PATTERN = STEP_UNITS_DESC.join('|');

const STEP_MEASUREMENT_RE_SOURCE = `(\\d+\\s+\\d+\\s*/\\s*\\d+|\\d+\\s*/\\s*\\d+|\\d+\\.\\d+|\\d+)\\s*(${STEP_UNIT_PATTERN})\\b`;

export interface StepQuantityMatch {
  start: number;
  end: number;
  value: number;
  unit: string;
}

function matchIsInsideParen(str: string, matchStart: number): boolean {
  let i = matchStart - 1;
  while (i >= 0 && /\s/.test(str[i])) i--;
  return i >= 0 && str[i] === '(';
}

export function findStepQuantityMatches(step: string): StepQuantityMatch[] {
  const out: StepQuantityMatch[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(STEP_MEASUREMENT_RE_SOURCE, 'gi');
  while ((m = re.exec(step)) !== null) {
    if (matchIsInsideParen(step, m.index)) continue;
    const numStr = m[1];
    const unitStr = m[2];
    const val = parseQuantityToken(numStr);
    if (val === null) continue;
    out.push({
      start: m.index,
      end: m.index + m[0].length,
      value: val,
      unit: unitStr,
    });
  }
  return out;
}

export function scaleCookingStep(step: string, ratio: number): string {
  if (ratio === 1) return step;
  const matches = findStepQuantityMatches(step);
  let result = step;
  if (matches.length > 0) {
    for (let i = matches.length - 1; i >= 0; i--) {
      const { start, end, value, unit } = matches[i];
      const scaled = value * ratio;
      const head = formatScaledAmount(scaled);
      const originalSlice = step.slice(start, end);
      const uIdx = originalSlice.toLowerCase().indexOf(unit.toLowerCase());
      const beforeUnit = uIdx >= 0 ? originalSlice.slice(0, uIdx) : originalSlice;
      const sep = /\s/.test(beforeUnit) ? ' ' : '';
      result = result.slice(0, start) + head + sep + unit + result.slice(end);
    }
  }
  return scaleParentheticalMeasures(result, ratio);
}

/** @deprecated Prefer formatScaledAmount; kept if callers relied on rounding helper. */
export function capTwoDecimals(n: number): number {
  return Math.round(n * 100) / 100;
}
