export interface CarBrand {
  id: string;
  name: string;
  nameAr: string;
  models: string[];
}

export const INITIAL_CAR_CATALOG: CarBrand[] = [
  {
    id: 'toyota',
    name: 'Toyota',
    nameAr: 'تويوتا',
    models: [
      'Corolla',
      'Yaris',
      'Yaris Cross',
      'Belta',
      'Camry',
      'RAV4',
      'Fortuner',
      'Land Cruiser',
      'Hilux',
      'Rush',
      'C-HR',
      'Prado',
      'Rumion',
      'Avanza',
      'Urban Cruiser',
      'Prius',
      'Avalon',
      'Innova',
      'Crown',
      'Hiace'
    ]
  },
  {
    id: 'hyundai',
    name: 'Hyundai',
    nameAr: 'هيونداي',
    models: [
      'Elantra',
      'Accent',
      'Tucson',
      'Sonata',
      'Creta',
      'Bayon',
      'i10',
      'i20',
      'i30',
      'Santa Fe',
      'Matrix',
      'Verna',
      'Kona',
      'Venue',
      'Palisade',
      'Azera',
      'Staria'
    ]
  },
  {
    id: 'kia',
    name: 'Kia',
    nameAr: 'كيا',
    models: [
      'Cerato',
      'Sportage',
      'Rio',
      'Carens',
      'Seltos',
      'Pegas',
      'Sonet',
      'Picanto',
      'Carnival',
      'Sorento',
      'K5',
      'Telluride',
      'Soul',
      'EV6'
    ]
  },
  {
    id: 'nissan',
    name: 'Nissan',
    nameAr: 'نيسان',
    models: [
      'Sunny',
      'Sentra',
      'Qashqai',
      'Juke',
      'X-Trail',
      'Patrol',
      'Tiida',
      'Altima',
      'Pathfinder',
      'Navara',
      'Kicks',
      'Micra'
    ]
  },
  {
    id: 'mercedes',
    name: 'Mercedes-Benz',
    nameAr: 'مرسيدس بنز',
    models: [
      'C-Class (C180 / C200)',
      'E-Class (E200 / E250 / E300)',
      'S-Class (S450 / S500)',
      'A-Class',
      'CLA',
      'GLA',
      'GLC',
      'GLE',
      'GLS',
      'G-Class',
      'V-Class'
    ]
  },
  {
    id: 'bmw',
    name: 'BMW',
    nameAr: 'بي إم دبليو',
    models: [
      '3 Series (316i / 320i)',
      '5 Series (520i / 530i)',
      '7 Series',
      'X1',
      'X3',
      'X4',
      'X5',
      'X6',
      'X7',
      '1 Series',
      '2 Series',
      '4 Series'
    ]
  },
  {
    id: 'chevrolet',
    name: 'Chevrolet',
    nameAr: 'شيفروليه',
    models: [
      'Optra',
      'Aveo',
      'Cruze',
      'Captiva',
      'Lanos',
      'Spark',
      'Malibu',
      'Tahoe',
      'Suburban',
      'Traverse',
      'Groove',
      'Silverado'
    ]
  },
  {
    id: 'renault',
    name: 'Renault',
    nameAr: 'رينو',
    models: [
      'Megane',
      'Logan',
      'Sandero',
      'Stepway',
      'Duster',
      'Kadjar',
      'Fluence',
      'Clio',
      'Captur',
      'Austral'
    ]
  },
  {
    id: 'peugeot',
    name: 'Peugeot',
    nameAr: 'بيجو',
    models: [
      '301',
      '208',
      '2008',
      '3008',
      '5008',
      '508',
      '408',
      'Partner'
    ]
  },
  {
    id: 'mitsubishi',
    name: 'Mitsubishi',
    nameAr: 'ميتسوبيشي',
    models: [
      'Lancer',
      'Eclipse Cross',
      'Outlander',
      'Pajero',
      'Mirage',
      'Attrage',
      'Xpander',
      'ASX',
      'L200'
    ]
  },
  {
    id: 'skoda',
    name: 'Skoda',
    nameAr: 'سكودا',
    models: [
      'Octavia',
      'Superb',
      'Kodiaq',
      'Karoq',
      'Kamiq',
      'Fabia',
      'Scala',
      'Rapid'
    ]
  },
  {
    id: 'mg',
    name: 'MG',
    nameAr: 'إم جي',
    models: [
      'MG 5',
      'MG 6',
      'MG ZS',
      'MG RX5',
      'MG HS',
      'MG GT',
      'MG ONE',
      'MG 4'
    ]
  },
  {
    id: 'chery',
    name: 'Chery',
    nameAr: 'شيري',
    models: [
      'Tiggo 3',
      'Tiggo 7',
      'Tiggo 8',
      'Tiggo 8 Pro',
      'Tiggo 4 Pro',
      'Arrizo 5',
      'Arrizo 8',
      'Envy'
    ]
  },
  {
    id: 'geely',
    name: 'Geely',
    nameAr: 'جيلي',
    models: [
      'Coolray',
      'Emgrand',
      'Okavango',
      'Monjaro',
      'GX3 Pro',
      'Geometry C',
      'Starray'
    ]
  },
  {
    id: 'suzuki',
    name: 'Suzuki',
    nameAr: 'سوزوكي',
    models: [
      'Swift',
      'Dzire',
      'Baleno',
      'Ciaz',
      'Ertiga',
      'Jimny',
      'Vitara',
      'Celerio',
      'Fronx',
      'S-Presso'
    ]
  },
  {
    id: 'volkswagen',
    name: 'Volkswagen',
    nameAr: 'فولكس فاجن',
    models: [
      'Passat',
      'Golf',
      'Jetta',
      'Tiguan',
      'Polo',
      'Arteon',
      'Touareg',
      'T-Roc',
      'Teramont'
    ]
  },
  {
    id: 'fiat',
    name: 'Fiat',
    nameAr: 'فيات',
    models: [
      'Tipo',
      'Punto',
      '500',
      '500X',
      'Panda',
      'Doblo',
      'Bravo',
      'Linea'
    ]
  },
  {
    id: 'byd',
    name: 'BYD',
    nameAr: 'بي واي دي',
    models: [
      'F3',
      'Qin Plus',
      'Song Plus',
      'Yuan Plus',
      'Tang',
      'Han',
      'Seal',
      'Dolphin'
    ]
  },
  {
    id: 'honda',
    name: 'Honda',
    nameAr: 'هوندا',
    models: [
      'Civic',
      'Accord',
      'CR-V',
      'City',
      'HR-V',
      'Pilot'
    ]
  },
  {
    id: 'ford',
    name: 'Ford',
    nameAr: 'فورد',
    models: [
      'Focus',
      'Fiesta',
      'Fusion',
      'EcoSport',
      'Kuga',
      'Ranger',
      'Explorer',
      'Everest',
      'Territory',
      'F-150',
      'Mustang'
    ]
  },
  {
    id: 'opel',
    name: 'Opel',
    nameAr: 'أوبل',
    models: [
      'Astra',
      'Insignia',
      'Corsa',
      'Grandland',
      'Crossland',
      'Mokka',
      'Vectra'
    ]
  },
  {
    id: 'mazda',
    name: 'Mazda',
    nameAr: 'مازدا',
    models: [
      'Mazda 3',
      'Mazda 6',
      'CX-3',
      'CX-5',
      'CX-9',
      'CX-30',
      'CX-60'
    ]
  },
  {
    id: 'jeep',
    name: 'Jeep',
    nameAr: 'جيب',
    models: [
      'Grand Cherokee',
      'Wrangler',
      'Renegade',
      'Compass',
      'Cherokee',
      'Gladiator'
    ]
  },
  {
    id: 'changan',
    name: 'Changan',
    nameAr: 'شانجان',
    models: [
      'Alsvin',
      'Eado',
      'CS35 Plus',
      'CS55 Plus',
      'CS75 Plus',
      'CS85',
      'CS95',
      'UNI-T',
      'UNI-K',
      'UNI-V'
    ]
  },
  {
    id: 'haval',
    name: 'Haval',
    nameAr: 'هافال',
    models: [
      'Jolion',
      'H6',
      'Dargo',
      'H9'
    ]
  },
  {
    id: 'jetour',
    name: 'Jetour',
    nameAr: 'جيتور',
    models: [
      'X70',
      'X70 Plus',
      'X90 Plus',
      'Dashing',
      'T2'
    ]
  },
  {
    id: 'lexus',
    name: 'Lexus',
    nameAr: 'لكزس',
    models: [
      'ES',
      'RX',
      'LX',
      'NX',
      'IS',
      'GX',
      'LS'
    ]
  },
  {
    id: 'audi',
    name: 'Audi',
    nameAr: 'أودي',
    models: [
      'A3',
      'A4',
      'A6',
      'A8',
      'Q3',
      'Q5',
      'Q7',
      'Q8'
    ]
  }
];

const STORAGE_KEY = 'workshop_custom_car_catalog_v1';

/**
 * Loads car catalog including custom additions saved by the user.
 */
export function getCarCatalog(): CarBrand[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_CAR_CATALOG;
    const parsed: CarBrand[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load custom car catalog from storage', err);
  }
  return INITIAL_CAR_CATALOG;
}

/**
 * Saves entire catalog to localStorage.
 */
export function saveCarCatalog(catalog: CarBrand[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  } catch (err) {
    console.error('Failed to save car catalog to storage', err);
  }
}

/**
 * Adds a new brand or returns existing.
 */
export function addCustomBrand(brandName: string, initialModel?: string): CarBrand[] {
  const catalog = getCarCatalog();
  const trimmed = brandName.trim();
  if (!trimmed) return catalog;

  const existing = catalog.find(
    b => b.name.toLowerCase() === trimmed.toLowerCase() || b.nameAr === trimmed
  );

  if (existing) {
    if (initialModel && initialModel.trim() && !existing.models.includes(initialModel.trim())) {
      existing.models.push(initialModel.trim());
      saveCarCatalog(catalog);
    }
    return catalog;
  }

  const newBrand: CarBrand = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: trimmed,
    nameAr: trimmed,
    models: initialModel && initialModel.trim() ? [initialModel.trim()] : []
  };

  const updated = [...catalog, newBrand];
  saveCarCatalog(updated);
  return updated;
}

/**
 * Adds a new model to an existing brand.
 */
export function addCustomModel(brandNameOrId: string, modelName: string): CarBrand[] {
  const catalog = getCarCatalog();
  const trimmedModel = modelName.trim();
  const trimmedBrand = brandNameOrId.trim();
  if (!trimmedModel || !trimmedBrand) return catalog;

  const brand = catalog.find(
    b =>
      b.id === trimmedBrand ||
      b.name.toLowerCase() === trimmedBrand.toLowerCase() ||
      b.nameAr === trimmedBrand
  );

  if (brand) {
    const modelExists = brand.models.some(
      m => m.toLowerCase() === trimmedModel.toLowerCase()
    );
    if (!modelExists) {
      brand.models.push(trimmedModel);
      saveCarCatalog(catalog);
    }
  } else {
    // If brand didn't exist yet, create it with this model
    return addCustomBrand(trimmedBrand, trimmedModel);
  }

  return catalog;
}
