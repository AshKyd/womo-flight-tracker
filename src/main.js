import "./style.css";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import mapStyle from "./mapstyle.json";
import { interpolateCoordinates } from "./interpolate";

const geojsonSource = fetch("https://flights.kyd.au/aircrafts")
  .then((res) => res.json())
  .then((aircrafts) => ({
    type: "FeatureCollection",
    features: Object.values(aircrafts).flatMap((aircraft) =>
      interpolateCoordinates(aircraft.lineString || [], 0.005).map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: point,
        },
      }))
    ),
  }));

const map = new maplibregl.Map({
  container: document.querySelector("#app"),
  style: mapStyle, // style URL
  center: [153, -27.5], // starting position [lng, lat]
  zoom: 8, // starting zoom
  attributionControl: {
    compact: true,
    customAttribution:
      '© <a target="_blank" rel="noopener" href="https://openstreetmap.org/">OSM contributors</a> ♥ <a target="_blank" rel="noopener" href="https://donate.openstreetmap.org" class="donate-attr">Donate</a> ♥ Powered by <a target="_blank" rel="noopener" href="https://maplibre.org/">MapLibre</a>.',
  },
});

map.on("load", async () => {
  map.addControl(new maplibregl.NavigationControl());

  map.addSource("geojson-flights-points", {
    type: "geojson",
    data: await geojsonSource,
  });

  map.addLayer(
    {
      id: "flights-heat",
      type: "heatmap",
      source: "geojson-flights-points",
      // maxzoom: 9,
      paint: {
        // Increase the heatmap weight based on frequency and property magnitude
        "heatmap-weight": 0.2,
        // Increase the heatmap color weight weight by zoom level
        // heatmap-intensity is a multiplier on top of heatmap-weight
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
        // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
        // Begin color ramp at 0-stop with a 0-transparency color
        // to create a blur-like effect.
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(33,102,172,0)",
          0.2,
          "rgb(103,169,207)",
          0.4,
          "rgb(209,229,240)",
          0.6,
          "rgb(253,219,199)",
          0.8,
          "rgb(239,138,98)",
          1,
          "rgb(178,24,43)",
        ],
        // Adjust the heatmap radius by zoom level
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 13, 20],
        // Transition from heatmap to circle layer by zoom level
        // "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 9, 0],
      },
    },
    "waterway"
  );
});
