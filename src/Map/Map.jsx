import { useState, useEffect, useRef } from "preact/hooks";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import heatmapJson from "./heatmap.json";
import mapStyleJson from "./mapstyle.json";
import "./map.css";
import getState from "./state";
import Hud from "./Hud/Hud";

export function Map() {
  const [map, setMap] = useState();
  const [geojsonFlightsPointsSource, setGeojsonFlightsPointsSource] =
    useState();
  const [status, setStatus] = useState("firstload");
  const rootNode = useRef();
  const { geojson, date } = getState();

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
    if (!geojsonFlightsPointsSource || !geojson.value) {
      return;
    }
    geojsonFlightsPointsSource.setData(geojson.value);
    setStatus("loaded");
  }, [geojsonFlightsPointsSource, geojson.value]);

  return (
    <>
      <Hud title="Brisbane air traffic heatmap" date={`Live for ${date}`} />
      <div class={`map map--${status}`} ref={rootNode}></div>
      {status === "firstload" && (
        <div class="loader">
          <div class="loader__spinner"></div>
          <div class="loader__text">Loading...</div>
        </div>
      )}
    </>
  );
}
