// Server only: validation reads this, pages never do, so the list of
// contested areas stays out of every client bundle.
//
// No war pin may sit inside one of these boxes: they are the places China
// claims or disputes with a neighbour, where a pin can read as a claim and
// cost the site its reach in mainland China. Other disputed places (the
// Falklands, Crimea, Donbas, Gaza, the Kurils) take pins where the event
// happened, since the basemap draws no borders. The boxes are coarse on
// purpose and tuned so battle sites just outside (Xiamen, Gulangyu and Dadeng,
// Pingtan, Nanri, Fuzhou, the Brunei, Sabah and Sarawak coasts, Balabac and
// southern Palawan, Chillianwala, Gujrat, Jammu, Rawalpindi, Kaza, Shiquanhe,
// Tezpur, Dibrugarh, Tinsukia, Digboi, Ledo, Mon in Nagaland, Trashigang in
// Bhutan, Tsetang in Tibet) stay valid.
// Outlying islands get their own small boxes rather than a stretched big one,
// which would swallow the mainland coast beside them.

type Box = { name: string; west: number; south: number; east: number; north: number };

const CONTESTED_AREAS: readonly Box[] = [
  { name: "Taiwan", west: 120.0, south: 21.8, east: 122.2, north: 25.4 },
  { name: "Penghu Islands", west: 119.25, south: 23.1, east: 119.75, north: 23.85 },
  { name: "Taiwan's northern islets", west: 121.9, south: 25.4, east: 122.2, north: 25.7 },
  { name: "Pratas Islands", west: 116.6, south: 20.55, east: 117.0, north: 20.85 },
  { name: "Kinmen", west: 118.2, south: 24.35, east: 118.5, north: 24.55 },
  { name: "Kinmen (Dadan and Erdan)", west: 118.11, south: 24.34, east: 118.18, north: 24.4 },
  { name: "Kinmen (Wuqiu)", west: 119.42, south: 24.96, east: 119.48, north: 25.01 },
  { name: "Kinmen (Dongding)", west: 118.2, south: 24.13, east: 118.26, north: 24.19 },
  { name: "Matsu", west: 119.85, south: 25.9, east: 120.55, north: 26.4 },
  { name: "Kashmir and Aksai Chin", west: 73.3, south: 33.0, east: 80.5, north: 37.1 },
  { name: "Ladakh (Hanle, Chumar and Demchok)", west: 78.3, south: 32.5, east: 79.6, north: 33.0 },
  { name: "Gilgit-Baltistan (west)", west: 72.5, south: 35.0, east: 73.3, north: 37.1 },
  { name: "Arunachal Pradesh (west)", west: 91.6, south: 27.0, east: 94.0, north: 28.4 },
  { name: "Arunachal Pradesh (east)", west: 94.0, south: 27.6, east: 97.5, north: 29.5 },
  { name: "Arunachal Pradesh (south-east)", west: 96.0, south: 26.9, east: 97.5, north: 27.6 },
  { name: "Arunachal Pradesh (Tirap, Longding and Changlang)", west: 95.2, south: 26.7, east: 96.0, north: 27.2 },
  { name: "Paracel Islands", west: 111, south: 15.5, east: 113, north: 17.5 },
  { name: "Spratly Islands", west: 111.5, south: 7, east: 116, north: 12 },
  { name: "Spratly Islands (Half Moon Shoal and Reed Bank)", west: 116, south: 8.5, east: 117, north: 12 },
  { name: "Spratly Islands (Louisa and Royal Charlotte reefs)", west: 113.1, south: 6.2, east: 113.9, north: 7 },
  { name: "Luconia Shoals and James Shoal", west: 112.2, south: 3.85, east: 113.0, north: 5.75 },
  { name: "Scarborough Shoal", west: 117.5, south: 14.9, east: 118, north: 15.4 },
  { name: "Senkaku / Diaoyu Islands", west: 123.3, south: 25.6, east: 124.7, north: 26.0 },
];

/** The contested area a point falls in, or null. */
export function contestedAreaAt(lon: number, lat: number): string | null {
  const box = CONTESTED_AREAS.find((b) => b.west <= lon && lon <= b.east && b.south <= lat && lat <= b.north);
  return box?.name ?? null;
}
