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

    const splitTracksWithAircrafts = tracksWithAircrafts.reduce(
      (arr, track) => {
        // Split tracks when points are > 2000 metres apart
        if (!track.lineString || track.lineString.length < 2) {
          // If track has less than 2 points, just add it as is
          arr.push({
            aircraft: track.aircraft,
            lineString: track.lineString || [],
          });
          return arr;
        }

        // Start with the first point
        let currentSegment = [track.lineString[0]];
        let segments = [currentSegment];

        // Iterate through the remaining points
        for (let i = 1; i < track.lineString.length; i++) {
          const prevPoint = track.lineString[i - 1];
          const currentPoint = track.lineString[i];

          // Calculate distance between consecutive points
          const distance = getDistance(
            { latitude: prevPoint[1], longitude: prevPoint[0] },
            { latitude: currentPoint[1], longitude: currentPoint[0] }
          );

          if (distance > 5000) {
            // If distance is > 2000 meters, start a new segment
            currentSegment = [currentPoint];
            segments.push(currentSegment);
          } else {
            // Otherwise, add point to current segment
            currentSegment.push(currentPoint);
          }
        }

        // Add each segment as a separate track
        segments.forEach((segment) => {
          arr.push({
            aircraft: track.aircraft,
            lineString: segment,
          });
        });

        return arr;
      },
      []
    );

    const features = Object.values(splitTracksWithAircrafts).map((flight) => ({
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
