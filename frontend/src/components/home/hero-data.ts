export const MAKES_DATA: Record<string, string[]> = {
  Toyota: ["86", "Camry", "Corolla", "GR86", "GR Yaris", "HiLux", "LandCruiser", "Prado", "RAV4", "Yaris"],
  BMW: ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "i4", "i7", "M2", "M3", "M4", "M5", "X1", "X3", "X5", "X7"],
  "Mercedes-Benz": ["A-Class", "AMG GT", "C-Class", "CLA", "E-Class", "G-Class", "GLA", "GLC", "GLE", "GLS", "S-Class"],
  Audi: ["A3", "A4", "A5", "A6", "A7", "A8", "e-tron GT", "Q3", "Q5", "Q7", "Q8", "RS3", "RS4", "RS6", "S3", "S4", "TT"],
  Tesla: ["Cybertruck", "Model 3", "Model S", "Model X", "Model Y"],
  Porsche: ["718 Boxster", "718 Cayman", "911", "Cayenne", "Macan", "Panamera", "Taycan"],
  Honda: ["Accord", "City", "Civic", "CR-V", "HR-V", "Jazz", "Odyssey"],
  Ford: ["Bronco", "EcoSport", "Escape", "Everest", "Explorer", "F-150", "Mustang", "Ranger"],
  Mazda: ["BT-50", "CX-3", "CX-30", "CX-5", "CX-60", "CX-9", "Mazda2", "Mazda3", "Mazda6", "MX-5"],
  Volkswagen: ["Amarok", "Arteon", "Golf", "Golf GTI", "Golf R", "ID.4", "Passat", "Polo", "T-Roc", "Tiguan", "Touareg"],
  Hyundai: ["Elantra", "i20", "i30", "i30 N", "IONIQ 5", "IONIQ 6", "Kona", "Santa Fe", "Sonata", "Tucson"],
  Nissan: ["370Z", "Ariya", "GT-R", "Juke", "Leaf", "Navara", "Patrol", "X-Trail"],
  Subaru: ["BRZ", "Forester", "Impreza", "Levorg", "Outback", "WRX", "XV"],
  Kia: ["Carnival", "Cerato", "EV6", "EV9", "Seltos", "Sorento", "Sportage", "Stinger"],
  Lexus: ["CT", "ES", "GX", "IS", "LC", "LX", "NX", "RC", "RX", "UX"],
  "Land Rover": ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"],
  Jeep: ["Cherokee", "Compass", "Gladiator", "Grand Cherokee", "Renegade", "Wrangler"],
  Mitsubishi: ["ASX", "Eclipse Cross", "Outlander", "Pajero", "Pajero Sport", "Triton"],
};

export const POPULAR_MAKES = ["Toyota", "BMW", "Ford", "Mazda", "Hyundai", "Volkswagen", "Mercedes-Benz", "Subaru"];

export const YEARS = Array.from({ length: 6 }, (_, i) => String(2025 - i));

export const VARIANTS = ["Base", "Executive", "GT", "Luxury", "Performance", "Premium", "S-Line", "SE", "Sport", "ST"];

export const TYRE_WIDTHS = [
  "155", "165", "175", "185", "195", "205", "215", "225",
  "235", "245", "255", "265", "275", "285", "295", "305", "315",
];
export const POPULAR_WIDTHS = ["205", "215", "225", "235", "245", "255"];

export const PROFILES = ["30", "35", "40", "45", "50", "55", "60", "65", "70", "75", "80"];
export const POPULAR_PROFILES = ["40", "45", "50", "55"];

export const RIM_DIAMETERS = ["14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"];
export const POPULAR_RIMS = ["16", "17", "18", "19", "20"];
