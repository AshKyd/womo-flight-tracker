import "./style.css";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import mapStyle from "./mapstyle.json";
import { interpolateCoordinates } from "./interpolate";
import { debounce, throttle } from "lodash";

function sliceFeatureCollection(featureCollection, start, end) {
  return {
    type: "FeatureCollection",
    features: featureCollection.features.slice(start, end),
  };
}

function isInBbox(point, bounds) {
  // bounds is a MapLibre bounds object from map.getBounds()
  const [lng, lat] = point;
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return lng >= sw.lng && lng <= ne.lng && lat >= sw.lat && lat <= ne.lat;
}

function extendBounds(bounds) {
  // Add 100% extra space to all sides by doubling the width and height
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const width = ne.lng - sw.lng;
  const height = ne.lat - sw.lat;

  const extendedSw = new maplibregl.LngLat(sw.lng - width, sw.lat - height);
  const extendedNe = new maplibregl.LngLat(ne.lng + width, ne.lat + height);

  return new maplibregl.LngLatBounds(extendedSw, extendedNe);
}


let geojsonFlightsPointsSource;
let tracks;

function setData() {
  const interpolateAmount = 0.005; //zoom < 13 ? 0.005 : 0.001
  const geojsonData = {
    type: "FeatureCollection",
    features: Object.values(tracks).flatMap((track) =>
      interpolateCoordinates(track.lineString || [], interpolateAmount).map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: point,
        },
      }))
    ),
  }
  geojsonFlightsPointsSource.setData(geojsonData);
}

function getDateFromHash() {
  const hash = window.location.hash.slice(1); // Remove the # symbol
  if (hash && /^\d{4}-\d{2}-\d{2}$/.test(hash)) {
    return hash;
  }
  return getAESTISOString().slice(0, 10);
}

async function refreshData() {
  console.log('refreshing data');
  const data = await fetch(`https://flights.kyd.au/tracks/${getDateFromHash()}`)
    .then((res) => res.json());
  tracks = data.tracks || data;

  if (geojsonFlightsPointsSource) {
    setData();
  }
}


function getAESTISOString() {
  const now = new Date();
  // Get UTC time, then add 10 hours
  const aest = new Date(now.getTime() + 10 * 60 * 60 * 1000);
  // Format as ISO 8601 without Z (local time)
  return aest.toISOString().replace('Z', '+10:00');
}

const geojsonData = refreshData();

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


map.on("load", async () => {
  map.addControl(new maplibregl.NavigationControl());

  map.addSource("geojson-flights-points", {
    type: "geojson",
    data: { type: 'FeatureCollection', features: [] },
  });
  geojsonFlightsPointsSource = map.getSource("geojson-flights-points");
  setData();

  map.addLayer(
    {
      id: "flights-heat",
      type: "heatmap",
      source: "geojson-flights-points",
      // maxzoom: 9,
      paint: {
        "heatmap-weight": 0.01,
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
          0.05,
          "rgba(255,255,0, .25)",
          0.2,
          "rgba(255,255,0, 1)",
          0.4,
          "rgba(255,128,0,1)",
          0.8,
          "rgba(255, 77, 0, 1)",
          1,
          "rgba(255, 29, 29,1)",
        ],
        "heatmap-radius": [
          "interpolate",
          ["exponential", 1],
          ["zoom"],
          9,
          3,
          12,
          30,
          13,
          50,
          14,
          100,
          15,
          200
        ],
      },
    },
    "waterway"
  );

  if (!!window.location.hash.slice(1)) {
    setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshData();
      }
    }, 60 * 1000);
    window.addEventListener('focus', refreshData)
  }

});
