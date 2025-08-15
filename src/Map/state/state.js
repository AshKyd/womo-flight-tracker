import {
  signal,
  effect,
  computed,
  useSignal,
  useComputed,
} from "@preact/signals";
import { useEffect } from "preact/hooks";
import { getScribbles } from "./scribbles";
import getPoints from "./points";
import polyline from "@mapbox/polyline";

const hashSignal = signal(window.location.hash.slice(1));
window.addEventListener("hashchange", () => {
  hashSignal.value = window.location.hash.slice(1);
});
const isDate = (hash) => hash && /^\d{4}-\d{2}-\d{2}$/.test(hash);
const getToday = () => {
  const now = new Date();
  const aest = new Date(now.getTime() + 10 * 60 * 60 * 1000);
  // Format as ISO 8601 without Z (local time)
  return aest.toISOString().slice(0, 10);
};
export const params = computed(() => {
  // legacy
  if (isDate(hashSignal.value)) {
    return { date: hashSignal };
  }

  // query string in hash
  const searchParams = new URLSearchParams(hashSignal.value);
  const result = {};
  searchParams.entries().forEach(([key, value]) => {
    result[key] = value;
  });
  result.date = result.date || getToday();
  result.viz = result.viz || "heatmap";
  return result;
});

export function setParam(newValues) {
  const newParams = {
    ...params.value,
    ...newValues,
  };
  // set this back to window.location.hash as a query string
  const searchParams = new URLSearchParams();
  Object.entries(newParams).forEach(([key, val]) => {
    searchParams.set(key, val);
  });
  window.location.hash = searchParams.toString();
}

export default function getState() {
  const tracks = useSignal([]);
  const aircrafts = useSignal([]);
  const status = useSignal("loading");
  const geojsonPoints = getPoints({ params, tracks });
  const geojsonScribble = getScribbles({ params, tracks, aircrafts });

  useEffect(() => {
    async function refreshData(reason) {
      console.log("refreshing data", { reason });
      status.value = "loading";
      const data = await fetch(
        `https://flights.kyd.au/v2/tracks/${params.value.date}`
      ).then((res) => res.json());
      // Decode polyline data
      Object.values(data.polylineTracks).forEach((track) => {
        track.lineString = polyline.decode(track.lineString);
      });
      tracks.value = data.polylineTracks;
      aircrafts.value = data.aircrafts;
      status.value = "loaded";
    }

    // refresh data when
    effect(() => {
      tracks.value = [];
      refreshData("new date " + params.value.date);
    });

    let interval;
    if (!window.location.hash.slice(1)) {
      interval = setInterval(() => {
        if (document.visibilityState === "visible") {
          refreshData("interval check");
        }
      }, 60 * 1000);
      window.addEventListener("focus", () => refreshData("focus"));
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  return {
    tracks,
    geojsonPoints,
    geojsonScribble,
  };
}
