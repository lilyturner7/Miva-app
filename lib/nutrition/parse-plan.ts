export type ParsedFood = {
  name: string;
  quantity?: number;
  unit?: string;
  raw: string;
};

export type ParsedMeal = {
  key: string;
  label: string;
  lines: string[];
  foods: ParsedFood[];
};

export type ParsedPlan = {
  meals: ParsedMeal[];
  unmatched: string[];
  sourceText: string;
};

const mealAliases: Array<{ key: string; label: string; patterns: RegExp[] }> = [
  { key: 'breakfast', label: 'Colazione', patterns: [/^colazione\b/i, /^breakfast\b/i] },
  { key: 'morning_snack', label: 'Spuntino mattina', patterns: [/spuntino\s*(mattina|mattutino)/i, /^spuntino\s*1\b/i] },
  { key: 'lunch', label: 'Pranzo', patterns: [/^pranzo\b/i, /^lunch\b/i] },
  { key: 'afternoon_snack', label: 'Spuntino pomeriggio', patterns: [/spuntino\s*(pomeriggio|pomeridiano)/i, /^spuntino\s*2\b/i] },
  { key: 'dinner', label: 'Cena', patterns: [/^cena\b/i, /^dinner\b/i] },
  { key: 'prebed', label: 'Pre-nanna', patterns: [/pre[-\s]?nanna/i, /prima\s+di\s+dormire/i] },
  { key: 'preworkout', label: 'Pre-workout', patterns: [/pre[-\s]?workout/i, /pre[-\s]?allenamento/i] },
  { key: 'postworkout', label: 'Post-workout', patterns: [/post[-\s]?workout/i, /post[-\s]?allenamento/i] },
];

function normalizeLine(line: string) {
  return line.replace(/[•●▪◦]/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectMeal(line: string) {
  return mealAliases.find((meal) => meal.patterns.some((pattern) => pattern.test(line)));
}

function parseFood(line: string): ParsedFood | null {
  const cleaned = line.replace(/^[-–—·]\s*/, '').trim();
  if (!cleaned || cleaned.length < 2) return null;

  const quantityPatterns = [
    /^(.*?)[\s,:-]+(\d+(?:[.,]\d+)?)\s*(g|gr|grammi|kg|ml|cl|l|pz|pezzi|fette|cucchiai?|cucchiaini?)\b/i,
    /^(\d+(?:[.,]\d+)?)\s*(g|gr|grammi|kg|ml|cl|l|pz|pezzi|fette|cucchiai?|cucchiaini?)\s+(.*)$/i,
  ];

  const first = cleaned.match(quantityPatterns[0]);
  if (first) {
    return {
      name: first[1].trim(),
      quantity: Number(first[2].replace(',', '.')),
      unit: first[3].toLowerCase(),
      raw: cleaned,
    };
  }

  const second = cleaned.match(quantityPatterns[1]);
  if (second) {
    return {
      name: second[3].trim(),
      quantity: Number(second[1].replace(',', '.')),
      unit: second[2].toLowerCase(),
      raw: cleaned,
    };
  }

  if (/\b(kcal|carboidrati|proteine|grassi|macro|calorie)\b/i.test(cleaned)) return null;
  return { name: cleaned, raw: cleaned };
}

export function parseNutritionPlan(sourceText: string): ParsedPlan {
  const lines = sourceText.split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const meals: ParsedMeal[] = [];
  const unmatched: string[] = [];
  let current: ParsedMeal | null = null;

  for (const line of lines) {
    const meal = detectMeal(line);
    if (meal) {
      current = meals.find((item) => item.key === meal.key) ?? {
        key: meal.key,
        label: meal.label,
        lines: [],
        foods: [],
      };
      if (!meals.includes(current)) meals.push(current);
      continue;
    }

    if (!current) {
      unmatched.push(line);
      continue;
    }

    current.lines.push(line);
    const food = parseFood(line);
    if (food) current.foods.push(food);
  }

  return { meals, unmatched, sourceText };
}
