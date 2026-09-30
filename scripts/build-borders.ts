/**
 * Regenerates data/borders/<cultureId>.json from a Cliopatria download
 * (CC BY 4.0). The dataset is 165 MB, so it stays out of the repo:
 *
 *   1. Download cliopatria.geojson.zip from the v0.2.0 release on Zenodo
 *      (https://zenodo.org/records/13363121) and unzip it anywhere.
 *   2. pnpm borders <path/to/cliopatria_polities_only.geojson> [cultureId ...]
 *
 * mapshaper runs through npx at a pinned version, so nothing is installed.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { BorderPolity, Borders, Geometry, Source } from "../src/lib/data/schema";
import { fromCliopatriaYear } from "../src/lib/years";

const MAPSHAPER = ["-y", "mapshaper@0.7.69"];

type Snapshot = {
  /** Astronomical, like every year in the app. */
  year: number;
  self: string[];
  rivals: string[];
  /** Read Cliopatria at this year instead, where its rows are coarser than the story. */
  dataYear?: number;
  /** Merge the self polities into one, clipped to the culture's mask. */
  clip?: boolean;
};

type CultureConfig = {
  /** Who the self polities are, for the credits line. */
  subject: string;
  simplify: string;
  snapshots: Snapshot[];
  /** Where the culture's lands can be, for polities that only partly belonged to it. */
  mask?: { name: string; year: number; keep: string[]; erase: string[] };
  /** What else was changed, for the credits line. */
  changes?: string;
};

const ROME_SELF = ["Roman Kingdom", "Roman Republic", "Roman Empire", "Western Roman Empire", "Eastern Roman Empire", "Byzantine Empire"];
const HRE = "(Holy Roman Empire)";
// From 1459 Cliopatria keeps only the small imperial states under the empire's
// name; the big ones are separate polities, some reaching far outside it.
const HRE_MEMBERS = [
  "Holy Roman Empire Minor States",
  "Habsburg Monarchy",
  "Kingdom of Bohemia",
  "Electorate of Saxony",
  "Electorate of Brandenburg",
  "Brandenburg-Prussia",
  "Kingdom of Prussia",
  "Duchy of Bavaria",
  "Electorate of Trier",
  "Electorate of Hesse",
  "Electorate of Württemberg",
  "Electorate of Baden",
  "Electorate of Salzburg",
  "Duchy of Lorraine",
  "County of Savoy",
  "Kingdom of Spain",
  "Swedish Empire",
  "Denmark-Norway",
  "Kingdom of Great Britain",
];

const CULTURES: Record<string, CultureConfig> = {
  rome: {
    subject: "the Roman polities",
    simplify: "25%",
    snapshots: [
      { year: -599, self: ROME_SELF, rivals: ["Etruscans", "Carthage", "Greek City-States"] },
      { year: -263, self: ROME_SELF, rivals: ["Carthage", "Antigonid Macedonia", "Seleucid Empire", "Ptolemaic Kingdom", "Greek Colonies"] },
      { year: -199, self: ROME_SELF, rivals: ["Carthage", "Antigonid Macedonia", "Seleucid Empire", "Ptolemaic Kingdom"] },
      { year: -99, self: ROME_SELF, rivals: ["Parthian Empire", "Ptolemaic Kingdom", "Kingdom of Pontus", "Kingdom of Numidia", "Seleucid Empire"] },
      { year: -43, self: ROME_SELF, rivals: ["Parthian Empire", "Ptolemaic Kingdom"] },
      { year: 14, self: ROME_SELF, rivals: ["Parthian Empire"] },
      { year: 117, self: ROME_SELF, rivals: ["Parthian Empire"] },
      { year: 300, self: ROME_SELF, rivals: ["Sasanian Empire", "Gothia"] },
      { year: 395, self: ROME_SELF, rivals: ["Sasanian Empire", "Huns"] },
      { year: 476, self: ROME_SELF, rivals: ["Sasanian Empire", "Visigothic Kingdom", "Vandal Kingdom", "Ostrogoths", "Burgundian Kingdom", "Kingdom of the Franks"] },
      { year: 565, self: ROME_SELF, rivals: ["Sasanian Empire", "Kingdom of the Franks", "Visigothic Kingdom", "Lombards", "Avar Khaganate"] },
      { year: 700, self: ROME_SELF, rivals: ["Umayyad Caliphate", "Kingdom of Italy", "Avar Khaganate", "First Bulgarian Empire", "Visigothic Kingdom"] },
      { year: 1025, self: ROME_SELF, rivals: ["Fatimid Caliphate", "Holy Roman Empire", "Kingdom of Hungary"] },
      { year: 1180, self: ROME_SELF, rivals: ["Sultanate of Rum", "Kingdom of Hungary", "Kingdom of Sicily"] },
      // Cliopatria keeps a 4,000 km2 "Byzantine Empire" while the Latin Empire
      // held Constantinople; the successor states in exile are the story.
      { year: 1210, self: ["Nicaean Empire", "Despotate of Epirus", "Empire of Trebizond"], rivals: ["Latin Empire", "Sultanate of Rum", "Second Bulgarian Empire"] },
      { year: 1355, self: ROME_SELF, rivals: ["Ottoman Empire", "Serbian Empire", "Second Bulgarian Empire"] },
      { year: 1450, self: ROME_SELF, rivals: ["Ottoman Empire"] },
    ],
  },
  "carolingian-empire": {
    subject: "the Frankish kingdoms",
    simplify: "20%",
    changes:
      "The 843 map uses Cliopatria's first rows after the Treaty of Verdun, which it dates 850-859.",
    snapshots: [
      { year: 732, self: ["Kingdom of the Franks"], rivals: ["Umayyad Caliphate", "Kingdom of Italy", "Saxons", "Bavarians", "Avar Khaganate", "Byzantine Empire", "Kingdom of Asturias", "Kingdom of Mercia", "Kingdom of Wessex"] },
      { year: 751, self: ["Kingdom of the Franks"], rivals: ["Umayyad Caliphate", "Kingdom of Italy", "Aquitaine", "Saxons", "Bavarians", "Avar Khaganate", "Byzantine Empire", "Kingdom of Asturias", "Kingdom of Mercia"] },
      { year: 768, self: ["Kingdom of the Franks"], rivals: ["Emirate of Córdoba", "Kingdom of Italy", "Papal States", "Saxons", "Bavarians", "Avar Khaganate", "Byzantine Empire", "Kingdom of Asturias", "Kingdom of Wessex"] },
      { year: 775, self: ["Kingdom of the Franks"], rivals: ["Emirate of Córdoba", "Papal States", "Duchy of Benevento", "Saxons", "Bavarians", "Avar Khaganate", "Byzantine Empire", "Kingdom of Asturias", "Kingdom of Wessex"] },
      { year: 788, self: ["Kingdom of the Franks"], rivals: ["Emirate of Córdoba", "Papal States", "Avar Khaganate", "Byzantine Empire", "First Bulgarian Empire", "Kingdom of Asturias"] },
      { year: 800, self: ["Kingdom of the Franks"], rivals: ["Emirate of Córdoba", "Papal States", "Duchy of Benevento", "Avar Khaganate", "Byzantine Empire", "First Bulgarian Empire", "Obotrites", "Kingdom of Asturias", "Kingdom of Mercia"] },
      { year: 814, self: ["Kingdom of the Franks"], rivals: ["Emirate of Córdoba", "Papal States", "Duchy of Benevento", "Byzantine Empire", "First Bulgarian Empire", "Great Moravia", "Obotrites", "Kingdom of Asturias", "Kingdom of Wessex"] },
      { year: 843, dataYear: 850, self: ["West Franks", "Middle Franks", "East Franks"], rivals: ["Emirate of Córdoba", "Papal States", "Duchy of Benevento", "Byzantine Empire", "First Bulgarian Empire", "Great Moravia", "Obotrites", "Kingdom of Brittany", "Kingdom of Asturias", "Kingdom of Wessex"] },
      { year: 870, self: ["West Franks", "East Franks"], rivals: ["Emirate of Córdoba", "Papal States", "Duchy of Benevento", "Byzantine Empire", "First Bulgarian Empire", "Great Moravia", "Kingdom of Brittany", "Kingdom of Asturias", "Kingdom of Wessex"] },
      { year: 888, self: ["West Franks", "East Franks", "Upper Burgundy"], rivals: ["Kingdom of Italy", "Lower Burgundy", "Emirate of Córdoba", "Papal States", "Byzantine Empire", "Great Moravia", "Kingdom of Brittany", "Danelaw", "Kingdom of Wessex"] },
    ],
  },
  "holy-roman-empire": {
    subject: "the Holy Roman Empire",
    simplify: "15%",
    mask: { name: HRE, year: 1453, keep: [HRE], erase: ["Teutonic Order"] },
    changes:
      "Where marked, the empire is drawn as the union of the Cliopatria polities that were imperial estates, clipped to the empire's 1453 extent in Cliopatria less the Teutonic Order's Prussia, because from 1459 Cliopatria files only the small imperial states under the empire's name.",
    snapshots: [
      { year: 955, self: [HRE], rivals: ["West Franks", "Upper Burgundy", "Kingdom of Italy", "Kingdom of Denmark", "Principality of Hungary", "Duchy of Bohemia", "Byzantine Empire", "Caliphate of Córdoba", "Papal States", "Kingdom of England"] },
      { year: 962, self: [HRE], rivals: ["West Franks", "Kingdom of Denmark", "Kingdom of Poland", "Principality of Hungary", "Duchy of Bohemia", "Byzantine Empire", "Caliphate of Córdoba", "Papal States", "Kingdom of England"] },
      { year: 1077, self: [HRE], rivals: ["Kingdom of France", "Kingdom of Denmark", "Kingdom of Poland", "Kingdom of Hungary", "Kingdom of Croatia", "Republic of Venice", "Papal States", "Norman Italy", "Byzantine Empire", "Norman England", "Kingdom of Castile", "Kingdom of Aragon"] },
      { year: 1176, self: [HRE], rivals: ["Kingdom of France", "Kingdom of Denmark", "(Duchies of Poland)", "Kingdom of Hungary", "Republic of Venice", "Papal States", "Kingdom of Sicily", "Byzantine Empire", "Kingdom of Castile", "Crown of Aragon"] },
      { year: 1273, clip: true, self: [HRE], rivals: ["Kingdom of France", "Kingdom of England", "Kingdom of Denmark", "Kingdom of Sweden", "Teutonic Order", "(Duchies of Poland)", "Grand Duchy of Lithuania", "Kingdom of Hungary", "Republic of Venice", "Papal States", "House of Anjou-Sicily", "Crown of Aragon", "Crown of Castile"] },
      { year: 1356, clip: true, self: [HRE], rivals: ["Kingdom of France", "Kingdom of England", "Kingdom of Denmark", "Kingdom of Sweden", "Teutonic Order", "Kingdom of Poland", "Grand Duchy of Lithuania", "Kingdom of Hungary", "Serbian Empire", "Republic of Venice", "Papal States", "Kingdom of Naples", "Crown of Aragon", "Crown of Castile"] },
      { year: 1415, clip: true, self: [HRE], rivals: ["Kingdom of France", "Kingdom of England", "Kalmar Union", "Teutonic Order", "Kingdom of Poland", "Grand Duchy of Lithuania", "Kingdom of Hungary", "Ottoman Empire", "Republic of Venice", "Papal States"] },
      { year: 1521, clip: true, self: HRE_MEMBERS, rivals: ["Kingdom of France", "Kingdom of Spain", "Kingdom of England", "Kalmar Union", "Teutonic Order", "Kingdom of Hungary", "Ottoman Empire", "Swiss Confederation", "Republic of Venice", "Papal States"] },
      { year: 1555, clip: true, self: HRE_MEMBERS, rivals: ["Kingdom of France", "Kingdom of Spain", "Kingdom of England", "Denmark-Norway", "Kingdom of Sweden", "Duchy of Prussia", "Eastern Hungarian Kingdom", "Ottoman Empire", "Swiss Confederation", "Republic of Venice", "Papal States"] },
      { year: 1648, clip: true, self: HRE_MEMBERS, rivals: ["Kingdom of France", "Kingdom of Spain", "Kingdom of England", "Dutch Republic", "Denmark-Norway", "Swedish Empire", "Polish-Lithuanian Commonwealth", "Habsburg Monarchy", "Ottoman Empire", "Swiss Confederation", "Republic of Venice", "Papal States"] },
      { year: 1683, clip: true, self: HRE_MEMBERS, rivals: ["Kingdom of France", "Kingdom of Spain", "Dutch Republic", "Denmark-Norway", "Swedish Empire", "Polish-Lithuanian Commonwealth", "Habsburg Monarchy", "Ottoman Empire", "Swiss Confederation", "Republic of Venice"] },
      { year: 1805, clip: true, self: HRE_MEMBERS, rivals: ["First French Empire", "Batavian Republic", "Helvetic Republic", "Italian Republic", "Denmark-Norway", "Swedish Empire", "Kingdom of Prussia", "Habsburg Monarchy", "Russian Empire", "Ottoman Empire"] },
    ],
  },
};

type Label = [en: string, es: string, zh: string];

const LABELS: Record<string, Label> = {
  "Roman Kingdom": ["Roman Kingdom", "Reino romano", "罗马王国"],
  "Roman Republic": ["Roman Republic", "República romana", "罗马共和国"],
  "Roman Empire": ["Roman Empire", "Imperio romano", "罗马帝国"],
  "Western Roman Empire": ["Western Roman Empire", "Imperio romano de Occidente", "西罗马帝国"],
  "Eastern Roman Empire": ["Eastern Roman Empire", "Imperio romano de Oriente", "东罗马帝国"],
  "Byzantine Empire": ["Byzantine Empire", "Imperio bizantino", "拜占庭帝国"],
  "Nicaean Empire": ["Empire of Nicaea", "Imperio de Nicea", "尼西亚帝国"],
  "Despotate of Epirus": ["Despotate of Epirus", "Despotado de Epiro", "伊庇鲁斯专制国"],
  "Empire of Trebizond": ["Empire of Trebizond", "Imperio de Trebisonda", "特拉比松帝国"],
  Etruscans: ["Etruscans", "Etruscos", "伊特鲁里亚人"],
  Carthage: ["Carthage", "Cartago", "迦太基"],
  "Greek City-States": ["Greek city-states", "Ciudades-estado griegas", "希腊城邦"],
  "Greek Colonies": ["Greek colonies", "Colonias griegas", "希腊殖民城邦"],
  "Antigonid Macedonia": ["Macedonia", "Macedonia", "马其顿"],
  "Seleucid Empire": ["Seleucid Empire", "Imperio seléucida", "塞琉古帝国"],
  "Ptolemaic Kingdom": ["Ptolemaic Egypt", "Egipto ptolemaico", "托勒密埃及"],
  "Parthian Empire": ["Parthian Empire", "Imperio parto", "帕提亚帝国"],
  "Kingdom of Pontus": ["Pontus", "Ponto", "本都王国"],
  "Kingdom of Numidia": ["Numidia", "Numidia", "努米底亚"],
  "Sasanian Empire": ["Sasanian Empire", "Imperio sasánida", "萨珊王朝"],
  Gothia: ["Goths", "Godos", "哥特人"],
  Huns: ["Huns", "Hunos", "匈人"],
  "Visigothic Kingdom": ["Visigothic Kingdom", "Reino visigodo", "西哥特王国"],
  "Vandal Kingdom": ["Vandal Kingdom", "Reino vándalo", "汪达尔王国"],
  Ostrogoths: ["Ostrogoths", "Ostrogodos", "东哥特人"],
  "Burgundian Kingdom": ["Burgundians", "Burgundios", "勃艮第王国"],
  "Kingdom of the Franks": ["Franks", "Francos", "法兰克王国"],
  Lombards: ["Lombards", "Lombardos", "伦巴第人"],
  "Avar Khaganate": ["Avars", "Ávaros", "阿瓦尔汗国"],
  "Umayyad Caliphate": ["Umayyad Caliphate", "Califato omeya", "倭马亚哈里发国"],
  "Kingdom of Italy": ["Kingdom of Italy", "Reino de Italia", "意大利王国"],
  "Kingdom of Italy (Lombard)": ["Lombard Kingdom of Italy", "Reino lombardo de Italia", "伦巴第意大利王国"],
  "First Bulgarian Empire": ["Bulgarian Empire", "Imperio búlgaro", "保加利亚第一帝国"],
  "Fatimid Caliphate": ["Fatimid Caliphate", "Califato fatimí", "法蒂玛王朝"],
  "Holy Roman Empire": ["Holy Roman Empire", "Sacro Imperio Romano Germánico", "神圣罗马帝国"],
  "Kingdom of Hungary": ["Hungary", "Hungría", "匈牙利王国"],
  "Sultanate of Rum": ["Seljuk Sultanate of Rum", "Sultanato selyúcida de Rum", "罗姆苏丹国"],
  "Kingdom of Sicily": ["Kingdom of Sicily", "Reino de Sicilia", "西西里王国"],
  "Latin Empire": ["Latin Empire", "Imperio latino", "拉丁帝国"],
  "Second Bulgarian Empire": ["Bulgarian Empire", "Imperio búlgaro", "保加利亚第二帝国"],
  "Ottoman Empire": ["Ottoman Empire", "Imperio otomano", "奥斯曼帝国"],
  "Serbian Empire": ["Serbian Empire", "Imperio serbio", "塞尔维亚帝国"],
  // Carolingian Empire and its neighbours
  Saxons: ["Saxons", "Sajones", "萨克森人"],
  Bavarians: ["Bavaria", "Baviera", "巴伐利亚"],
  Aquitaine: ["Aquitaine", "Aquitania", "阿基坦"],
  "Kingdom of Asturias": ["Asturias", "Asturias", "阿斯图里亚斯王国"],
  "Kingdom of Mercia": ["Mercia", "Mercia", "麦西亚王国"],
  "Kingdom of Wessex": ["Wessex", "Wessex", "威塞克斯王国"],
  "Emirate of Córdoba": ["Emirate of Córdoba", "Emirato de Córdoba", "科尔多瓦埃米尔国"],
  "Papal States": ["Papal States", "Estados Pontificios", "教皇国"],
  "Duchy of Benevento": ["Benevento", "Benevento", "贝内文托公国"],
  Obotrites: ["Obotrites", "Abodritas", "奥博德里特人"],
  "Great Moravia": ["Great Moravia", "Gran Moravia", "大摩拉维亚"],
  "Kingdom of Brittany": ["Brittany", "Bretaña", "布列塔尼王国"],
  "West Franks": ["West Francia", "Francia Occidental", "西法兰克王国"],
  "Middle Franks": ["Middle Francia", "Francia Media", "中法兰克王国"],
  "East Franks": ["East Francia", "Francia Oriental", "东法兰克王国"],
  "Upper Burgundy": ["Upper Burgundy", "Alta Borgoña", "上勃艮第"],
  "Lower Burgundy": ["Lower Burgundy", "Baja Borgoña", "下勃艮第"],
  Danelaw: ["Danelaw", "Danelaw", "丹麦区"],
  // Holy Roman Empire and its neighbours
  [HRE]: ["Holy Roman Empire", "Sacro Imperio Romano Germánico", "神圣罗马帝国"],
  "Kingdom of Denmark": ["Denmark", "Dinamarca", "丹麦王国"],
  "Principality of Hungary": ["Hungarians", "Húngaros", "匈牙利公国"],
  "Duchy of Bohemia": ["Bohemia", "Bohemia", "波希米亚公国"],
  "Caliphate of Córdoba": ["Caliphate of Córdoba", "Califato de Córdoba", "科尔多瓦哈里发国"],
  "Kingdom of England": ["England", "Inglaterra", "英格兰王国"],
  "Kingdom of Poland": ["Poland", "Polonia", "波兰王国"],
  "(Duchies of Poland)": ["Poland", "Polonia", "波兰"],
  "Kingdom of France": ["France", "Francia", "法兰西王国"],
  "Kingdom of Croatia": ["Croatia", "Croacia", "克罗地亚王国"],
  "Republic of Venice": ["Venice", "Venecia", "威尼斯共和国"],
  "Norman Italy": ["Norman Italy", "Italia normanda", "诺曼意大利"],
  "Norman England": ["England", "Inglaterra", "英格兰"],
  "Kingdom of Castile": ["Castile", "Castilla", "卡斯蒂利亚王国"],
  "Kingdom of Aragon": ["Aragon", "Aragón", "阿拉贡王国"],
  "Crown of Aragon": ["Aragon", "Aragón", "阿拉贡王国"],
  "Crown of Castile": ["Castile", "Castilla", "卡斯蒂利亚王国"],
  "Kingdom of Sweden": ["Sweden", "Suecia", "瑞典王国"],
  "Teutonic Order": ["Teutonic Order", "Orden Teutónica", "条顿骑士团"],
  "Grand Duchy of Lithuania": ["Lithuania", "Lituania", "立陶宛大公国"],
  "House of Anjou-Sicily": ["Angevin Naples and Sicily", "Nápoles y Sicilia angevinas", "安茹王朝那不勒斯与西西里"],
  "Kingdom of Naples": ["Naples", "Nápoles", "那不勒斯王国"],
  "Kalmar Union": ["Kalmar Union", "Unión de Kalmar", "卡尔马联盟"],
  "Kingdom of Spain": ["Spain", "España", "西班牙"],
  "Swiss Confederation": ["Swiss Confederation", "Confederación Suiza", "瑞士邦联"],
  "Denmark-Norway": ["Denmark-Norway", "Dinamarca-Noruega", "丹麦-挪威"],
  "Duchy of Prussia": ["Prussia", "Prusia", "普鲁士公国"],
  "Eastern Hungarian Kingdom": ["Eastern Hungarian Kingdom", "Reino húngaro oriental", "东匈牙利王国"],
  "Dutch Republic": ["Dutch Republic", "República de los Países Bajos", "荷兰共和国"],
  "Swedish Empire": ["Sweden", "Suecia", "瑞典帝国"],
  "Polish-Lithuanian Commonwealth": ["Poland-Lithuania", "Polonia-Lituania", "波兰立陶宛联邦"],
  "Habsburg Monarchy": ["Habsburg lands", "Tierras de los Habsburgo", "哈布斯堡领地"],
  "First French Empire": ["French Empire", "Imperio francés", "法兰西第一帝国"],
  "Batavian Republic": ["Batavian Republic", "República Bátava", "巴达维亚共和国"],
  "Helvetic Republic": ["Helvetic Republic", "República Helvética", "赫尔维蒂共和国"],
  "Italian Republic": ["Italian Republic", "República Italiana", "意大利共和国"],
  "Kingdom of Prussia": ["Prussia", "Prusia", "普鲁士王国"],
  "Russian Empire": ["Russian Empire", "Imperio ruso", "俄罗斯帝国"],
};

const CLIOPATRIA_SOURCES: Source[] = [
  {
    citation:
      "Bennett, James S., Mutch, Erin, Tollefson, Andrew, Chalstrey, Ed, et al. (2025). \"Cliopatria: a geospatial database of world-wide political entities from 3400 BCE to 2024 CE.\" Scientific Data 12.",
    url: "https://doi.org/10.1038/s41597-025-04516-9",
  },
  {
    citation: "Seshat Global History Databank. Cliopatria releases on Zenodo (concept record 13363121).",
    url: "https://zenodo.org/records/13363121",
  },
  {
    citation: "Creative Commons Attribution 4.0 International licence, which Cliopatria is released under.",
    url: "https://creativecommons.org/licenses/by/4.0/",
  },
];

function sources(config: CultureConfig): Source[] {
  const changes = [
    `polygons for ${config.subject} and their neighbours were extracted for ${config.snapshots.length} snapshot years`,
    `simplified with mapshaper 0.7.69 (Visvalingam, ${config.simplify} of vertices kept)`,
    "rounded to 0.01 degrees, and given shortened, translated labels.",
  ].join(", ");
  return [
    {
      citation: `Seshat Global History Databank (2026). Cliopatria: a comprehensive geospatial dataset of world polities, version 0.2.0 (released 16 May 2026), cliopatria.geojson. CC BY 4.0. Changes made here: ${changes}${config.changes ? ` ${config.changes}` : ""}`,
      url: "https://github.com/Seshat-Global-History-Databank/cliopatria",
    },
    ...CLIOPATRIA_SOURCES,
  ];
}

type Feature = { type: "Feature"; properties: { name: string; role: BorderPolity["role"] }; geometry: Geometry | null };
type ClioRow = { name: string; from: number; to: number; geometry: Geometry };

function loadCliopatria(file: string): ClioRow[] {
  console.error(`loading ${file}...`);
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
    features: { properties: { Name: string; FromYear: number; ToYear: number; Type: string }; geometry: Geometry }[];
  };
  return raw.features
    .filter((f) => f.properties.Type === "POLITY")
    .map((f) => ({
      name: f.properties.Name,
      from: fromCliopatriaYear(f.properties.FromYear),
      to: fromCliopatriaYear(f.properties.ToYear),
      geometry: f.geometry,
    }));
}

const kebab = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function mapshaper(...args: string[]) {
  execFileSync("npx", [...MAPSHAPER, ...args], { stdio: ["ignore", "ignore", "pipe"] });
}

function writeFeatures(file: string, features: Feature[]) {
  fs.writeFileSync(file, JSON.stringify({ type: "FeatureCollection", features }));
}

function readFeatures(file: string): Feature[] {
  return (JSON.parse(fs.readFileSync(file, "utf8")) as { features: Feature[] }).features;
}

function build(cultureId: string, config: CultureConfig, rows: ClioRow[], work: string): Borders {
  const rowsAt = (name: string, year: number) => rows.filter((r) => r.name === name && r.from <= year && year <= r.to);
  const pick = (names: string[], year: number, role: BorderPolity["role"]): Feature[] =>
    names.flatMap((name) => {
      const found = rowsAt(name, year);
      if (role === "rival" && found.length === 0) console.error(`  !! ${year}: Cliopatria has no row for rival "${name}"`);
      return found.map((r) => ({ type: "Feature" as const, properties: { name, role }, geometry: r.geometry }));
    });

  const mask = path.join(work, `${cultureId}-mask.geojson`);
  if (config.mask) {
    const { year, keep, erase } = config.mask;
    writeFeatures(`${mask}-keep.geojson`, pick(keep, year, "self"));
    writeFeatures(`${mask}-erase.geojson`, pick(erase, year, "self"));
    mapshaper(`${mask}-keep.geojson`, "-dissolve", "-erase", `${mask}-erase.geojson`, "-o", mask, "force");
  }

  const snapshots = config.snapshots.map((snap) => {
    const dataYear = snap.dataYear ?? snap.year;
    let self = pick(snap.self, dataYear, "self");
    let rivals = pick(snap.rivals, dataYear, "rival");
    if (self.length === 0) throw new Error(`${snap.year}: no self polity found`);
    const base = path.join(work, `${cultureId}-${snap.year}`);

    if (snap.clip) {
      if (!config.mask) throw new Error(`${cultureId}: clip needs a mask`);
      writeFeatures(`${base}-self.geojson`, self);
      const name = config.mask.name;
      mapshaper(`${base}-self.geojson`, "-clip", mask, "-dissolve", "-each", `name=${JSON.stringify(name)}, role="self"`, "-o", `${base}-clipped.geojson`, "force");
      self = readFeatures(`${base}-clipped.geojson`);
      // Rivals that held imperial lands too (Sweden's Pomerania) keep only the rest.
      writeFeatures(`${base}-rivals.geojson`, rivals);
      mapshaper(`${base}-rivals.geojson`, "-erase", `${base}-clipped.geojson`, "-o", `${base}-outside.geojson`, "force");
      rivals = readFeatures(`${base}-outside.geojson`);
    }

    writeFeatures(`${base}-snap.geojson`, [...self, ...rivals]);
    mapshaper(`${base}-snap.geojson`, "-simplify", config.simplify, "keep-shapes", "-o", "precision=0.01", `${base}-simp.geojson`, "force");

    const polities: BorderPolity[] = [];
    for (const f of readFeatures(`${base}-simp.geojson`)) {
      const g = f.geometry;
      if (!g) continue;
      const polys = (g.type === "MultiPolygon" ? g.coordinates : [g.coordinates])
        .map((poly) => poly.filter((ring) => ring.length >= 4))
        .filter((poly) => poly.length > 0);
      if (polys.length === 0) {
        console.error(`  !! ${snap.year}: ${f.properties.name} vanished in simplification`);
        continue;
      }
      // Cliopatria gives the Lombard kingdom (to 774) and the later Kingdom of Italy one name.
      const key = f.properties.name === "Kingdom of Italy" && snap.year < 775 ? "Kingdom of Italy (Lombard)" : f.properties.name;
      const label = LABELS[key];
      if (!label) throw new Error(`No label for "${f.properties.name}"`);
      const geometry: Geometry = polys.length === 1 ? { type: "Polygon", coordinates: polys[0] } : { type: "MultiPolygon", coordinates: polys };
      polities.push({ id: kebab(f.properties.name), label: { en: label[0], es: label[1], zh: label[2] }, role: f.properties.role, geometry });
    }
    console.error(`${snap.year}: ${polities.map((p) => `${p.id} (${p.role})`).join(", ")}`);
    return { year: snap.year, polities };
  });

  snapshots.sort((a, b) => a.year - b.year);
  return { cultureId, sources: sources(config), snapshots };
}

function main() {
  const [clioFile, ...ids] = process.argv.slice(2);
  if (!clioFile) {
    console.error("usage: pnpm borders <cliopatria_polities_only.geojson> [cultureId ...]");
    process.exit(1);
  }
  const rows = loadCliopatria(clioFile);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "borders-"));
  for (const id of ids.length > 0 ? ids : Object.keys(CULTURES)) {
    const config = CULTURES[id];
    if (!config) throw new Error(`No borders config for "${id}"`);
    const out = path.join("data", "borders", `${id}.json`);
    fs.writeFileSync(out, `${JSON.stringify(build(id, config, rows, work))}\n`);
    console.error(`wrote ${out}: ${Math.round(fs.statSync(out).size / 1024)} KB`);
  }
  fs.rmSync(work, { recursive: true });
}

main();
