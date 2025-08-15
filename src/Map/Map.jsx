import { useState, useEffect, useRef } from "preact/hooks";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
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
          "green",
          ["==", ["get", "category"], "A1"],
          "orange",
          ["==", ["get", "category"], ""],
          "orange",
          ["==", ["get", "category"], "A2"],
          "red",
          "red",
        ],
        "line-width": 1,
        "line-opacity": ["case", ["==", ["get", "category"], "A7"], 1, 0.25],
      },
    });

    // Add mouse move event listener for hover functionality
    const onMouseMove = (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["geojson-scribble-layer"],
      });

      if (features.length > 0) {
        const feature = features[0];
        console.log("Hovered line category:", feature.properties?.category);
      }
    };

    map.on("mousemove", onMouseMove);

    return () => {
      map.removeLayer("geojson-scribble-layer");
      map.removeSource("geojson-scribble");
      map.off("mousemove", onMouseMove);
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
