import { useComputed } from "@preact/signals";
import { getDistance } from "geolib";

// A- = Unspecified powered aircraft
// A1 = Light (< 15 500 lbs.)
// A2 = Small (15 500 to 75 000 lbs.)
// A3 = Large (75 000 to 300 000 lbs.)
// A4 = High Vortex Large(aircraft such as B-757)
// A5 = Heavy (> 300 000 lbs.)
// A6 = High Performance ( > 5 g acceleration and > 400kts)
// A7 = Rotorcraft
// B- = Unspecified unpowered aircraft or UAV or spacecraft
// B1 = Glider/sailplane
// B2 = Lighter-than-Air
// B3 = Parachutist/Skydiver
// B4 = Ultralight/hang-glider/paraglider
// B5 = Reserved
// B6 = Unmanned Aerial Vehicle
// B7 = Space/Trans-atmospheric vehicle
// C- = Unspecified ground installation or vehicle
// C1 = Surface Vehicle - Emergency Vehicle
// C2 = Surface Vehicle - Service Vehicle
// C3 = Fixed Ground or Tethered Obstruction

export function getScribbles({ params, tracks, aircrafts }) {
  return useComputed(() => {
    if (params.value.viz !== "scribbles") {
      return;
    }

    const aircraftByCode = aircrafts.value.reduce((obj, ac) => {
      obj[ac.name] = ac;
      return obj;
    }, {});

    const tracksWithAircrafts = Object.entries(tracks.value).map(
      ([name, { lineString }]) => ({
        aircraft: aircraftByCode[name],
        lineString,
      })
    );

    const features = Object.values(tracksWithAircrafts).map((flight) => ({
      type: "Feature",
      properties: { category: flight.aircraft?.category },
      geometry: {
        type: "LineString",
        coordinates: flight.lineString,
      },
    }));

    return {
      type: "FeatureCollection",
      features,
    };
  });
}
