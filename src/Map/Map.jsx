import { useState, useEffect } from 'preact/hooks'
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import heatmapJson from './heatmap.json'
import mapStyleJson from './mapstyle.json'
import './map.css'
import getState from './state';

export function Map() {

    const [map, setMap] = useState();
    const [geojsonFlightsPointsSource, setGeojsonFlightsPointsSource] = useState()
    const { geojson } = getState();

    //  Set up the map
    useEffect(() => {
        const thisMap = new maplibregl.Map({
            container: document.querySelector("#app"),
            style: mapStyleJson, // style URL
            center: [153, -27.5], // starting position [lng, lat]
            zoom: 8, // starting zoom
            attributionControl: {
                compact: true,
                customAttribution: [
                    '© <a target="_blank" href="https://openstreetmap.org/">OSM contributors</a>',
                    '<a target="_blank" href="https://adsb.fi/">Data: adsb.fi</a>',
                    '<a href="https://github.com/AshKyd/womo-flight-tracker">Source code</a>',
                    'Powered by <a target="_blank" href="https://maplibre.org/">MapLibre</a>.'
                ].join(' ♥ ')
            },
        });

        thisMap.fitBounds([
            [152.789, -27.6268], // [west, south]
            [153.219, -27.307], // [east, north]
        ]);


        thisMap.on("load", async () => {
            thisMap.addControl(new maplibregl.NavigationControl());
            setMap(thisMap)
        })

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
            data: { type: 'FeatureCollection', features: [] },
        });
        map.addLayer(
            heatmapJson,
            "waterway"
        );
        setGeojsonFlightsPointsSource(map.getSource("geojson-flights-points"));

    }, [map]);

    // Update heatmap data
    useEffect(() => {
        if (!geojsonFlightsPointsSource || !geojson.value) {
            return;
        }
        geojsonFlightsPointsSource.setData(geojson.value);
    }, [geojsonFlightsPointsSource, geojson.value])

    return (<div class="map"></div>)
}
