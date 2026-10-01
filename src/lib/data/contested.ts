// Server only: validation reads this, pages never do, so the list of
// contested areas stays out of every client bundle.
//
// No war pin may sit inside one of these boxes: they are the places China
// claims or disputes with a neighbour, where a pin can read as a claim and
// cost the site its reach in mainland China. Other disputed places (the
// Falklands, Crimea, Donbas, Gaza, the Kurils) take pins where the event
// happened, since the basemap draws no borders. The boxes are coarse on purpose and tuned so
// battle sites just outside (Xiamen, Fuzhou, Chillianwala, Gujrat, Jammu,
// Rawalpindi, Tezpur, Dibrugarh, Ledo, Trashigang in Bhutan, Tsetang in Tibet)
// stay valid.

type Box = { name: string; west: number; south: number; east: number; north: number };

const CONTESTED_AREAS: readonly Box[] = [
  { name: "Taiwan and Penghu", west: 119.3, south: 21.8, east: 122.2, north: 25.4 },
  { name: "Kinmen", west: 118.2, south: 24.35, east: 118.5, north: 24.55 },
  { name: "Matsu", west: 119.85, south: 25.9, east: 120.55, north: 26.4 },
  { name: "Kashmir and Aksai Chin", west: 73.3, south: 33.0, east: 80.5, north: 37.1 },
  { name: "Gilgit-Baltistan (west)", west: 72.5, south: 35.0, east: 73.3, north: 37.1 },
  { name: "Arunachal Pradesh (west)", west: 91.6, south: 27.0, east: 94.0, north: 28.4 },
  { name: "Arunachal Pradesh (east)", west: 94.0, south: 27.6, east: 97.5, north: 29.5 },
  { name: "Arunachal Pradesh (south-east)", west: 96.0, south: 26.9, east: 97.5, north: 27.6 },
  { name: "Paracel Islands", west: 111, south: 15.5, east: 113, north: 17.5 },
  { name: "Spratly Islands", west: 111.5, south: 7, east: 117.5, north: 12 },
  { name: "Scarborough Shoal", west: 117.5, south: 14.9, east: 118, north: 15.4 },
  { name: "Senkaku / Diaoyu Islands", west: 123.3, south: 25.6, east: 124.7, north: 26.0 },
];

/** The contested area a point falls in, or null. */
export function contestedAreaAt(lon: number, lat: number): string | null {
  const box = CONTESTED_AREAS.find((b) => b.west <= lon && lon <= b.east && b.south <= lat && lat <= b.north);
  return box?.name ?? null;
}
