import { DOMParser } from "xmldom";
import * as toGeoJSON from "@tmcw/togeojson";

export function parseKml(buffer: Buffer) {
  const xml = new DOMParser().parseFromString(buffer.toString());
  const geo = toGeoJSON.kml(xml);

  if (!geo.features.length) {
    throw new Error("Invalid KML");
  }

  return geo.features[0].geometry;
}
