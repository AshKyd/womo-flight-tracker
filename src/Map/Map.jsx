import { useState, useEffect, useRef } from "preact/hooks";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { GeolocateControl } from "maplibre-gl";
import heatmapJson from "./heatmap.json";
import mapStyleJson from "./mapstyle.json";
import "./map.css";
import getState, { params } from "./state/state";
import Hud from "./Hud/Hud";

const emptyGeoJson = {
  type: "FeatureCollection",
  features: [],
};

export function Map() {
  const [map, setMap] = useState();
  const [geojsonFlightsPointsSource, setGeojsonFlightsPointsSource] =
    useState();
  const [status, setStatus] = useState("firstload");
  const rootNode = useRef();
  const { geojsonPoints, geojsonScribble } = getState();

  //  Set up the map
  useEffect(() => {
    if (!rootNode.current) {
      return;
    }
    const thisMap = new maplibregl.Map({
      container: rootNode.current,
      style: mapStyleJson, // style URL
      center: [153, -27.5], // starting position [lng, lat]
      zoom: 8, // starting zoom
      attributionControl: {
        compact: true,
        customAttribution: [
          '© <a target="_blank" href="https://openstreetmap.org/">OSM contributors</a>',
          '<a target="_blank" href="https://adsb.fi/">Data: adsb.fi</a>',
          '<a href="https://github.com/AshKyd/womo-flight-tracker">Source code</a>',
          'Powered by <a target="_blank" href="https://maplibre.org/">MapLibre</a>.',
        ].join(" ♥ "),
      },
    });

    thisMap.fitBounds([
      [152.789, -27.6268], // [west, south]
      [153.219, -27.307], // [east, north]
    ]);

    thisMap.on("load", async () => {
      thisMap.addControl(new maplibregl.NavigationControl());

      thisMap.addControl(
        new GeolocateControl({
          positionOptions: {
            enableHighAccuracy: false,
          },
          trackUserLocation: false,
        })
      );
      setMap(thisMap);
    });

    // Cleanup function to destroy map on unmount
    return () => {
      thisMap.remove();
    };
  }, []);

  // Set up the heatmap
  useEffect(() => {
    if (!map) {
      return;
    }
    map.addSource("geojson-flights-points", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer(heatmapJson, "waterway");
    setGeojsonFlightsPointsSource(map.getSource("geojson-flights-points"));
  }, [map]);

  // Update heatmap data
  useEffect(() => {
    if (!geojsonFlightsPointsSource) {
      return;
    }
    if (params.value.viz !== "heatmap") {
      geojsonFlightsPointsSource.setData(emptyGeoJson);
      setStatus("ready");
      return;
    }
    if (!geojsonPoints.value || geojsonPoints.value.features?.length === 0) {
      return;
    }
    geojsonFlightsPointsSource.setData(geojsonPoints.value);
    setStatus("ready");
  }, [geojsonFlightsPointsSource, geojsonPoints.value, params.value.viz]);

  useEffect(() => {
    if (params.value.viz !== "scribbles" || !map) {
      return;
    }

    map.addSource("geojson-scribble", {
      type: "geojson",
      data: geojsonScribble.value || emptyGeoJson,
    });

    map.addLayer({
      id: "geojson-scribble-layer",
      type: "line",
      source: "geojson-scribble",
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "category"], "A7"],
          "black",
          "red",
        ],
        "line-width": 1,
        "line-opacity": [
          "case",
          ["==", ["get", "category"], "A7"],
          0.5,
          ["==", ["get", "category"], "A1"],
          0.1,
          ["==", ["get", "category"], ""],
          0.1,
          ["==", ["get", "category"], "A2"],
          0.1,
          0.25,
        ],
      },
    });
    setStatus("ready");

    return () => {
      map.removeLayer("geojson-scribble-layer");
      map.removeSource("geojson-scribble");
    };
  }, [geojsonScribble.value, params.value.viz, map]);

  useEffect(() => {
    if (!geojsonFlightsPointsSource) {
      return;
    }
    geojsonFlightsPointsSource.setData(emptyGeoJson);
    if (status !== "firstload") {
      setStatus("refreshing");
    }
  }, [params.value.date]);

  return (
    <>
      <Hud title="Brisbane air traffic heatmap" />
      {(status === "firstload" || status === "refreshing") && (
        <div class="loader">
          <div class="loader__contents">
            <div class="loader__spinner"></div>
            <div class="loader__text">Loading...</div>
          </div>
        </div>
      )}
      <div class={`map map--${status}`} ref={rootNode}></div>
    </>
  );
}
