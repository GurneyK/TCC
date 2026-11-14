import type { Bank, BankAccount, CurrencyCode, Entity, Region } from "./types";

/** The fixed "today" the demo opens on. Keeps every run identical. */
export const DEMO_START = "2026-11-12T09:00:00.000Z";
export const DEFAULT_SEED = 20261112;

export const COMPANY = "Lumen Brands Group";

type EntitySeed = [id: string, name: string, country: string, currency: CurrencyCode, minMajor: number, region: Region];

const entitySeeds: EntitySeed[] = [
  ["ent-us", "Lumen Brands Inc.", "United States", "USD", 25_000_000, "NA"],
  ["ent-ca", "Lumen Brands Canada Ltd.", "Canada", "CAD", 8_000_000, "NA"],
  ["ent-mx", "Lumen Brands Mexico S.A.", "Mexico", "MXN", 90_000_000, "LATAM"],
  ["ent-br", "Lumen Brands Brasil Ltda.", "Brazil", "BRL", 30_000_000, "LATAM"],
  ["ent-uk", "Lumen Brands UK Ltd.", "United Kingdom", "GBP", 6_000_000, "EMEA"],
  ["ent-eu", "Lumen Brands Europe B.V.", "Netherlands", "EUR", 15_000_000, "EMEA"],
  ["ent-de", "Lumen Brands Deutschland GmbH", "Germany", "EUR", 7_000_000, "EMEA"],
  ["ent-za", "Lumen Brands South Africa (Pty)", "South Africa", "ZAR", 60_000_000, "EMEA"],
  ["ent-in", "Lumen Brands India Pvt. Ltd.", "India", "INR", 400_000_000, "APAC"],
  ["ent-sg", "Lumen Brands Singapore Pte.", "Singapore", "SGD", 5_000_000, "APAC"],
  ["ent-cn", "Lumen Brands China Co.", "China", "CNY", 35_000_000, "APAC"],
  ["ent-tc", "Lumen Treasury Centre B.V.", "Netherlands", "EUR", 50_000_000, "EMEA"],
];

export const ENTITIES: Entity[] = entitySeeds.map(([id, name, country, currency, minMajor, region]) => ({
  id,
  name,
  country,
  currency,
  minBalance: { minor: minMajor * 100, currency },
  region,
}));

export const TREASURY_CENTRE_ID = "ent-tc";

export const BANKS: Bank[] = [
  { id: "bank-harborline", name: "Harborline Bank" },
  { id: "bank-northgate", name: "Northgate Commercial" },
  { id: "bank-crestwood", name: "Crestwood Trust" },
  { id: "bank-pacific", name: "Pacific Meridian Bank" },
  { id: "bank-alder", name: "Alder & Stone" },
];

type AccountSeed = [entityId: string, bankId: string, type: BankAccount["type"], balanceMajor: number, last4?: string];

/** About USD 4.5B in total across 29 accounts. */
export const ACCOUNT_SEEDS: AccountSeed[] = [
  ["ent-us", "bank-harborline", "operating", 520_000_000],
  ["ent-us", "bank-northgate", "collections", 380_000_000],
  ["ent-us", "bank-harborline", "payroll", 60_000_000],
  ["ent-us", "bank-pacific", "operating", 140_000_000],
  ["ent-ca", "bank-northgate", "operating", 180_000_000],
  ["ent-ca", "bank-harborline", "collections", 95_000_000],
  ["ent-ca", "bank-northgate", "payroll", 15_000_000],
  ["ent-mx", "bank-pacific", "operating", 1_600_000_000],
  ["ent-mx", "bank-harborline", "collections", 1_100_000_000],
  ["ent-br", "bank-pacific", "operating", 70_000_000],
  ["ent-br", "bank-alder", "collections", 25_000_000],
  ["ent-uk", "bank-crestwood", "operating", 120_000_000],
  ["ent-uk", "bank-crestwood", "collections", 70_000_000, "4417"],
  ["ent-uk", "bank-alder", "payroll", 15_000_000],
  ["ent-eu", "bank-alder", "operating", 210_000_000],
  ["ent-eu", "bank-northgate", "collections", 140_000_000],
  ["ent-eu", "bank-crestwood", "payroll", 40_000_000],
  ["ent-de", "bank-crestwood", "operating", 110_000_000],
  ["ent-de", "bank-alder", "collections", 55_000_000],
  ["ent-za", "bank-crestwood", "operating", 900_000_000],
  ["ent-za", "bank-alder", "collections", 550_000_000],
  ["ent-in", "bank-pacific", "operating", 9_000_000_000],
  ["ent-in", "bank-harborline", "collections", 5_000_000_000],
  ["ent-sg", "bank-pacific", "operating", 220_000_000],
  ["ent-sg", "bank-harborline", "collections", 125_000_000],
  ["ent-cn", "bank-pacific", "operating", 1_300_000_000],
  ["ent-cn", "bank-northgate", "collections", 700_000_000],
  ["ent-tc", "bank-harborline", "concentration", 800_000_000],
  ["ent-tc", "bank-northgate", "concentration", 500_000_000],
];

/** Indicative mid rates: 1 unit of the currency in USD. */
export const BASE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  CAD: 0.7312,
  MXN: 0.0551,
  BRL: 0.1902,
  GBP: 1.2684,
  EUR: 1.0796,
  ZAR: 0.0553,
  INR: 0.01196,
  SGD: 0.7487,
  CNY: 0.1398,
};

export const CURRENCIES = Object.keys(BASE_RATES) as CurrencyCode[];

export const PERSONAS = {
  analyst: { name: "Priya Shah", title: "Treasury Analyst" },
  treasurer: { name: "Daniel Okafor", title: "Group Treasurer" },
  auditor: { name: "Mei Lin", title: "Internal Auditor" },
} as const;

export const CUSTOMER_NAMES = [
  "Brightmart", "Freshway Grocers", "Northstar Pharmacy", "Kiosko Plus", "Urban Basket", "Maple Market", "Tesvia",
  "Shopwell Online", "Cornerstone Foods", "Greenleaf Retail", "Bluebird Stores", "Harvest Lane", "Coastline Mart",
  "Daybreak Pharmacy", "Silverline Grocers", "Market Square", "Pinewood Retail", "Everyday Basket", "Summit Stores",
  "Lakeside Foods", "Brightway Wholesale", "Citymart Express", "Goldfield Grocers", "Riverbend Market", "Sunfield Pharmacy",
  "Northwind Retail", "Oakridge Stores", "Redwood Wholesale", "Westgate Market", "Clearwater Pharmacy", "Highline Grocers",
  "Meadowbrook Foods", "Starlight Retail", "Valleyview Market", "Fairhaven Stores", "Seaside Grocers", "Kingsway Pharmacy",
  "Brookfield Market", "Parkside Retail", "Ironbridge Wholesale",
];

const SUPPLIER_STEMS = [
  "Orchard", "Bluewave", "Halden", "Sunreach", "Verde", "Corrugate", "Ionix", "Granite", "Atlas", "Meridian",
  "Northfield", "Silverleaf", "Copperline", "Evergreen", "Brightpath", "Lumora", "Tidewater", "Stonebridge", "Clearview",
  "Ridgeway", "Fairmont", "Harrow", "Westbrook", "Pinecrest", "Amberly", "Redfern", "Crescent", "Hollis", "Larkspur",
];

const SUPPLIER_TRADES = [
  "Packaging Co.", "Logistics", "Chemicals", "Palm Oils", "Agro Supplies", "Partners", "Fragrances", "Plastics Ltd",
  "Freight Services", "Labels & Print", "Ingredients", "Glass Works", "Polymers", "Warehousing", "Media Group",
];

/** 180 supplier names. The first eight are the named suppliers from the brief. */
export function supplierNames(): string[] {
  const named = [
    "Orchard Packaging Co.", "Bluewave Logistics", "Halden Chemicals", "Sunreach Palm Oils", "Verde Agro Supplies",
    "Corrugate Partners", "Ionix Fragrances", "Kestral Holding Limited",
  ];
  const names = new Set(named);
  let i = 0;
  while (names.size < 180) {
    const stem = SUPPLIER_STEMS[i % SUPPLIER_STEMS.length];
    const trade = SUPPLIER_TRADES[Math.floor(i / SUPPLIER_STEMS.length) % SUPPLIER_TRADES.length];
    names.add(`${stem} ${trade}`);
    i += 1;
  }
  return [...names];
}
