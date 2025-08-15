import { useComputed } from "@preact/signals";
import { getDistance } from "geolib";

export function getScribbles({ params, tracks }) {
  return useComputed(() => {
    if (params.value.viz !== "scribbles") {
      return;
    }
    const flights = Object.values(tracks.value);
    // If points on a flight are more than 1km away, we should assume this is a new path and split it into a new flight.
    const features = [];

    flights.forEach((track) => {
      if (!track.lineString || track.lineString.length === 0) {
        return;
      }

      // Split the lineString into segments where distance > 1km
      const segments = [];
      let currentSegment = [track.lineString[0]];

      for (let i = 1; i < track.lineString.length; i++) {
        const prevPoint = track.lineString[i - 1];
        const currentPoint = track.lineString[i];
        const metresDistance = getDistance(prevPoint, currentPoint);

        if (metresDistance > 5000) {
          // Distance is more than 5km, start a new segment
          segments.push(currentSegment);
          currentSegment = [currentPoint];
        } else {
          // Continue the current segment
          currentSegment.push(currentPoint);
        }
      }

      // Add the last segment
      segments.push(currentSegment);

      // Create features for each segment
      segments.forEach((segment) => {
        if (segment.length > 1) {
          // Only create features for segments with at least 2 points
          features.push({
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: segment,
            },
          });
        }
      });
    });

    return {
      type: "FeatureCollection",
      features,
    };
  });
}
