import { useComputed } from "@preact/signals";
import { interpolateCoordinates } from "./interpolate";

const interpolateAmount = 0.005;
export default function getPoints({ params, tracks }) {
  return useComputed(() => {
    if (params.value.viz !== "heatmap") {
      return;
    }
    return {
      type: "FeatureCollection",
      features: Object.values(tracks.value).flatMap((track) =>
        interpolateCoordinates(track.lineString || [], interpolateAmount).map(
          (point) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: point,
            },
          })
        )
      ),
    };
  });
}
