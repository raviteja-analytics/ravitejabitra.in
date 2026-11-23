// Canonical IFCT 2017 (Indian Food Composition Tables, ICMR-NIN) Engine & Yield Factors
// Reference: National Institute of Nutrition, Indian Council of Medical Research (ICMR-NIN 2017)

export const IFCT_STAPLES = {
  'A015': {
    code: 'A015',
    name: 'Rice, raw, milled',
    hindiName: 'Chawal',
    category: 'Cereals and Millets',
    cookedYieldFactor: 2.98, // 100g raw dry rice -> ~298g cooked rice
    per100gRaw: {
      calories: 357,
      protein: 7.94,
      carbs: 78.24,
      fats: 0.52,
      fiber: 2.81,
      sugar: 0.12,
      calciumMg: 7.49,
      ironMg: 0.65,
      magnesiumMg: 31.8,
      potassiumMg: 110,
      sodiumMg: 3.9,
      zincMg: 1.21,
      vitaminB12Mcg: 0,
      vitaminD3Iu: 0
    }
  },
  'B021': {
    code: 'B021',
    name: 'Red gram / Toor dal',
    hindiName: 'Arhar / Toor Dal',
    category: 'Grain Legumes',
    cookedYieldFactor: 2.73, // 100g raw dry dal -> ~273g cooked dal
    per100gRaw: {
      calories: 331,
      protein: 21.70,
      carbs: 55.23,
      fats: 1.56,
      fiber: 9.12,
      sugar: 1.45,
      calciumMg: 56.8,
      ironMg: 4.82,
      magnesiumMg: 104,
      potassiumMg: 1104,
      sodiumMg: 18.2,
      zincMg: 2.70,
      vitaminB12Mcg: 0,
      vitaminD3Iu: 0
    }
  },
  'B010': {
    code: 'B010',
    name: 'Green gram / Moong dal',
    hindiName: 'Moong Dal (Yellow/Split)',
    category: 'Grain Legumes',
    cookedYieldFactor: 2.73,
    per100gRaw: {
      calories: 326,
      protein: 23.88,
      carbs: 52.59,
      fats: 1.35,
      fiber: 8.20,
      sugar: 1.80,
      calciumMg: 75.2,
      ironMg: 3.91,
      magnesiumMg: 127,
      potassiumMg: 843,
      sodiumMg: 28.1,
      zincMg: 2.80,
      vitaminB12Mcg: 0,
      vitaminD3Iu: 0
    }
  },
  'B013': {
    code: 'B013',
    name: 'Lentil / Masoor dal',
    hindiName: 'Masoor Dal (Split Red)',
    category: 'Grain Legumes',
    cookedYieldFactor: 2.73,
    per100gRaw: {
      calories: 323,
      protein: 24.35,
      carbs: 52.53,
      fats: 0.75,
      fiber: 10.70,
      sugar: 1.10,
      calciumMg: 69.0,
      ironMg: 5.60,
      magnesiumMg: 78.0,
      potassiumMg: 780,
      sodiumMg: 10.5,
      zincMg: 3.10,
      vitaminB12Mcg: 0,
      vitaminD3Iu: 0
    }
  },
  'A019': {
    code: 'A019',
    name: 'Wheat flour / Whole Atta',
    hindiName: 'Gehu ka Atta (Roti)',
    category: 'Cereals and Millets',
    cookedYieldFactor: 1.24, // Water absorption during dough kneading: ~100g dry atta -> ~124g cooked roti
    per100gRaw: {
      calories: 321,
      protein: 10.57,
      carbs: 64.17,
      fats: 1.53,
      fiber: 11.23,
      sugar: 1.65,
      calciumMg: 39.4,
      ironMg: 3.97,
      magnesiumMg: 125,
      potassiumMg: 315,
      sodiumMg: 17.1,
      zincMg: 2.30,
      vitaminB12Mcg: 0,
      vitaminD3Iu: 0
    }
  },
  'B004': {
    code: 'B004',
    name: 'Bengal gram, whole / Kala Chana',
    hindiName: 'Kala Chana / Chickpeas',
    category: 'Grain Legumes',
    cookedYieldFactor: 2.10, // 100g soaked/boiled chana -> ~210g cooked
    per100gRaw: {
      calories: 328,
      protein: 17.10,
      carbs: 53.00,
      fats: 5.30,
      fiber: 15.20,
      sugar: 2.10,
      calciumMg: 149,
      ironMg: 6.10,
      magnesiumMg: 130,
      potassiumMg: 870,
      sodiumMg: 24.0,
      zincMg: 3.20,
      vitaminB12Mcg: 0,
      vitaminD3Iu: 0
    }
  }
};

export const OIL_PROFILES = {
  'zero': {
    key: 'zero',
    label: 'Zero / Boiled',
    shortLabel: 'Boiled (0g oil)',
    addedFatG: 0,
    addedKcal: 0,
    icon: '💧',
    desc: 'Boiled, steamed, or zero added cooking fat'
  },
  'home_light': {
    key: 'home_light',
    label: 'Home Light',
    shortLabel: 'Home Light (+5g oil)',
    addedFatG: 5,
    addedKcal: 45,
    icon: '🏡',
    desc: 'Home-cooked with light tadka (1 tsp oil / ghee)'
  },
  'standard_home': {
    key: 'standard_home',
    label: 'Standard Home',
    shortLabel: 'Standard (+10g oil)',
    addedFatG: 10,
    addedKcal: 90,
    icon: '🍳',
    desc: 'Typical home curry / dal with standard oil absorption'
  },
  'pg_mess': {
    key: 'pg_mess',
    label: 'PG / Mess Style',
    shortLabel: 'Mess / PG (+18g oil)',
    addedFatG: 18,
    addedKcal: 162,
    icon: '🥘',
    desc: 'Commercial hostel / PG mess preparation with floating oil'
  },
  'restaurant': {
    key: 'restaurant',
    label: 'Restaurant / Dhaba',
    shortLabel: 'Restaurant (+28g oil)',
    addedFatG: 28,
    addedKcal: 252,
    icon: '🍲',
    desc: 'Rich restaurant / dhaba cooking with heavy butter, ghee & oil'
  }
};

export const OIL_PROFILE_KEYS = ['zero', 'home_light', 'standard_home', 'pg_mess', 'restaurant'];

export function cycleNextOilProfile(currentKey = 'home_light') {
  const currentIdx = OIL_PROFILE_KEYS.indexOf(currentKey);
  const nextIdx = (currentIdx + 1) % OIL_PROFILE_KEYS.length;
  return OIL_PROFILE_KEYS[nextIdx];
}

/**
 * Computes exact macros and micros using IFCT 2017 raw-per-100g values and cooked yield factor
 */
export function calculateIFCTNutrition({ foodCode, inputBasis = 'cooked', inputGrams = 100, oilProfileKey = 'home_light' }) {
  const item = IFCT_STAPLES[foodCode];
  if (!item) return null;

  const yieldFactor = item.cookedYieldFactor || 1.0;
  const rawEquivalentGrams = inputBasis === 'cooked'
    ? Math.round((inputGrams / yieldFactor) * 10) / 10
    : inputGrams;

  const ratio = rawEquivalentGrams / 100;
  const rawMacros = item.per100gRaw;
  const oil = OIL_PROFILES[oilProfileKey] || OIL_PROFILES['home_light'];

  // Base raw staple values
  const baseCalories = rawMacros.calories * ratio;
  const baseFats = rawMacros.fats * ratio;

  // Added cooking oil only applies to cooked dishes
  const addedFat = inputBasis === 'cooked' ? oil.addedFatG : 0;
  const addedKcal = inputBasis === 'cooked' ? oil.addedKcal : 0;

  return {
    foodCode,
    name: item.name,
    inputBasis,
    inputGrams,
    rawEquivalentGrams,
    yieldFactor,
    oilProfileKey,
    oilProfileLabel: oil.label,
    calories: Math.round(baseCalories + addedKcal),
    protein: Math.round(rawMacros.protein * ratio * 10) / 10,
    carbs: Math.round(rawMacros.carbs * ratio * 10) / 10,
    fats: Math.round((baseFats + addedFat) * 10) / 10,
    fiber: Math.round((rawMacros.fiber || 0) * ratio * 10) / 10,
    sugar: Math.round((rawMacros.sugar || 0) * ratio * 10) / 10,
    calciumMg: Math.round((rawMacros.calciumMg || 0) * ratio * 10) / 10,
    ironMg: Math.round((rawMacros.ironMg || 0) * ratio * 10) / 10,
    magnesiumMg: Math.round((rawMacros.magnesiumMg || 0) * ratio * 10) / 10,
    potassiumMg: Math.round((rawMacros.potassiumMg || 0) * ratio),
    sodiumMg: Math.round((rawMacros.sodiumMg || 0) * ratio),
    zincMg: Math.round((rawMacros.zincMg || 0) * ratio * 10) / 10,
    vitaminB12Mcg: rawMacros.vitaminB12Mcg || 0,
    vitaminD3Iu: rawMacros.vitaminD3Iu || 0
  };
}

/**
 * Data Engineering Bridge: Exports flat, analytics-ready JSON event records for warehouse ingestion
 */
export function generateNutritionEventRecords(logs = [], athleteProfile = {}, activeDietMode = 'veg') {
  return logs.map((log, index) => {
    const isCooked = log.inputBasis === 'cooked' || (log.oilProfile && log.oilProfile !== 'zero');
    const oil = OIL_PROFILES[log.oilProfile] || OIL_PROFILES['home_light'];

    // Extract micros from vitals string or IFCT mapped values
    const vitalsStr = (log.vitals || '') + ' ' + (log.rawMessage || '');
    const getVal = (regex) => {
      const m = vitalsStr.match(regex);
      return m ? parseFloat(m[1]) : 0;
    };

    return {
      event_id: `evt_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
      logged_at_utc: log.rawTimestamp || new Date().toISOString(),
      display_time: log.time || '',
      date_ist: log.date || new Date().toISOString().split('T')[0],
      diet_mode: activeDietMode === 'veg' ? 'veg' : 'non_veg',
      athlete_id: 'athlete_ravi',
      athlete_weight_kg: athleteProfile.weightKg || 69,
      athlete_gender: athleteProfile.gender || 'male',
      food_name: log.itemName || 'Meal',
      food_code: log.foodCode || (IFCT_STAPLES[log.foodCode]?.code || 'CUSTOM'),
      input_basis: log.inputBasis || (isCooked ? 'cooked' : 'raw'),
      input_grams: log.inputGrams || 100,
      cooked_yield_factor: log.yieldFactor || (IFCT_STAPLES[log.foodCode]?.cookedYieldFactor || 1.0),
      raw_equivalent_grams: log.rawEquivalentGrams || (log.inputBasis === 'cooked' && log.yieldFactor ? Math.round((log.inputGrams / log.yieldFactor) * 10) / 10 : (log.inputGrams || 100)),
      oil_profile: log.oilProfile || (isCooked ? 'home_light' : 'zero'),
      oil_added_fat_g: isCooked ? oil.addedFatG : 0,
      oil_added_kcal: isCooked ? oil.addedKcal : 0,
      calories: Math.round(log.calories || 0),
      protein_g: Math.round((log.protein || 0) * 10) / 10,
      carbs_g: Math.round((log.carbs || 0) * 10) / 10,
      fat_g: Math.round((log.fats || 0) * 10) / 10,
      fiber_g: Math.round((log.fiber || 0) * 10) / 10,
      sugar_g: Math.round((log.sugar || 0) * 10) / 10,
      micros: {
        sodium_mg: getVal(/sodium[:\s]+([\d.]+)\s*mg/i) || log.sodiumMg || 0,
        potassium_mg: getVal(/potassium[:\s]+([\d.]+)\s*mg/i) || log.potassiumMg || 0,
        magnesium_mg: getVal(/magnesium[:\s]+([\d.]+)\s*mg/i) || log.magnesiumMg || 0,
        calcium_mg: getVal(/calcium[:\s]+([\d.]+)\s*mg/i) || log.calciumMg || 0,
        iron_mg: getVal(/iron[:\s]+([\d.]+)\s*mg/i) || log.ironMg || 0,
        zinc_mg: getVal(/zinc[:\s]+([\d.]+)\s*mg/i) || log.zincMg || 0,
        vitamin_b12_mcg: getVal(/vitamin\s*b12[:\s]+([\d.]+)\s*mcg/i) || log.vitaminB12Mcg || 0,
        vitamin_d3_iu: getVal(/vitamin\s*d(?:3)?[:\s]+([\d.]+)\s*(?:iu|ui)/i) || log.vitaminD3Iu || 0,
        omega3_mg: getVal(/omega(?:-3)?[:\s]+([\d.]+)\s*mg/i) || log.omega3Mg || 0,
        creatine_g: getVal(/creatine(?:\s*monohydrate)?[:\s]+([\d.]+)\s*g/i) || log.creatineG || 0
      }
    };
  });
}
