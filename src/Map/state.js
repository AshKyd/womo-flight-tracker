import { signal, effect, computed, useSignal, useComputed } from '@preact/signals';
import { interpolateCoordinates } from './interpolate';
import { useEffect } from 'preact/hooks';

function getAESTISOString() {
    const now = new Date();
    // Get UTC time, then add 10 hours
    const aest = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    // Format as ISO 8601 without Z (local time)
    return aest.toISOString().replace('Z', '+10:00');
}

function getDateFromHash() {
    const hash = window.location.hash.slice(1); // Remove the # symbol
    if (hash && /^\d{4}-\d{2}-\d{2}$/.test(hash)) {
        return hash;
    }
    return getAESTISOString().slice(0, 10);
}

export default function getState() {
    const date = useSignal(getDateFromHash());
    const tracks = useSignal([]);
    const interpolateAmount = useSignal(0.005);
    const status = useSignal('loading');
    const geojson = useComputed(() => {
        const _interpolateAmount = interpolateAmount.value;
        return {
            type: "FeatureCollection",
            features: Object.values(tracks.value).flatMap((track) =>
                interpolateCoordinates(track.lineString || [], _interpolateAmount).map((point) => ({
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: point,
                    },
                }))
            ),
        }
    })

    useEffect(() => {
        async function refreshData(reason) {
            console.log('refreshing data', { reason });
            status.value = 'loading';
            const data = await fetch(`https://flights.kyd.au/tracks/${getDateFromHash()}`)
                .then((res) => res.json());
            tracks.value = data.tracks || data;
            status.value = 'loaded';
        }

        // refresh data when 
        effect(() => {
            refreshData('new date ' + date.value)
        });


        let interval;
        if (!window.location.hash.slice(1)) {
            interval = setInterval(() => {
                if (document.visibilityState === "visible") {
                    refreshData('interval check');
                }
            }, 60 * 1000);
            window.addEventListener('focus', () => refreshData('focus'));
        }


        return () => {
            if (interval) {
                clearInterval(interval)
            }
        }

    }, []);

    return {
        date, tracks, interpolateAmount, geojson
    }
}