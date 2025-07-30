import "./style.css";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import mapStyle from "./mapstyle.json";
import { interpolateCoordinates } from "./interpolate";

function sliceFeatureCollection(featureCollection, start, end) {
  return {
    type: "FeatureCollection",
    features: featureCollection.features.slice(start, end),
  };
}

function getAESTISOString() {
  const now = new Date();
  // Get UTC time, then add 10 hours
  const aest = new Date(now.getTime() + 10 * 60 * 60 * 1000);
  // Format as ISO 8601 without Z (local time)
  return aest.toISOString().replace('Z', '+10:00');
}

const geojsonData = fetch(`https://flights.kyd.au/tracks/${getAESTISOString().slice(0, 10)}`)
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
    customAttribution: [
        '© <a target="_blank" href="https://openstreetmap.org/">OSM contributors</a>',
        '<a target="_blank" href="https://adsb.fi/">Data: adsb.fi</a>',
        'Powered by <a target="_blank" href="https://maplibre.org/">MapLibre</a>.'
        ].join(' ♥ ')
  },
});

map.fitBounds([
  [152.789, -27.6268], // [west, south]
  [153.219, -27.307], // [east, north]
]);

let geojsonFlightsPointsSource;

map.on("load", async () => {
  map.addControl(new maplibregl.NavigationControl());

  map.addSource("geojson-flights-points", {
    type: "geojson",
    data: await geojsonData,
  });
  geojsonFlightsPointsSource = map.getSource("geojson-flights-points");
  console.log(await geojsonData);

  map.addLayer(
    {
      id: "flights-heat",
      type: "heatmap",
      source: "geojson-flights-points",
      // maxzoom: 9,
      paint: {
        // Increase the heatmap weight based on frequency and property magnitude
        "heatmap-weight": 0.03,
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
          "rgba(255,255,0, 0)",
          0.2,
          "rgba(255,255,0, 1)",
          0.5,
          "rgba(255,128,0,1)",
          0.8,
          "rgba(255, 77, 0, 1)",
          1,
          "rgba(255, 29, 29,1)",
        ],
        // Adjust the heatmap radius to be approximately 125 meters (250 meters wide)
        // at every zoom level. The 'exponential' interpolation with a base of 2
        // helps maintain a consistent real-world size as zoom levels change.
        // At zoom 12, the radius will be ~3 pixels.
        // At zoom 18, the radius will be ~210 pixels.
        "heatmap-radius": [
          "interpolate",
          ["exponential", 1],
          ["zoom"],
          9,
          3,
          13,
          30,
        ],
      },
    },
    "waterway"
  );
});
