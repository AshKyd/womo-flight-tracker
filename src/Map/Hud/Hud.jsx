import { params, setParam } from "../state/state";
import "./hud.css";

export default function Hud({ title }) {
  const pastFortnight = [];

  // Generate dates for the past fortnight (14 days) including today
  for (let i = 0; i < 14; i++) {
    const thisDate = new Date();
    // Get UTC time, then add 10 hours for AEST
    const aest = new Date(thisDate.getTime() + 10 * 60 * 60 * 1000);
    aest.setDate(aest.getDate() - i);
    const dateString = aest.toISOString().split("T")[0];
    pastFortnight.push(dateString);
  }

  function onChange(e) {
    const newValue = e.target.value;
    setParam({ date: newValue });
  }

  return (
    <div class="womo-hud">
      <h1>{title}</h1>
      <div class="womo-hud__controls">
        <select value={params.value.date} onChange={onChange}>
          {pastFortnight.map((dateString) => (
            <option key={dateString} value={dateString}>
              {dateString}
              {dateString === pastFortnight[0] ? " - today's live data" : ""}
            </option>
          ))}
        </select>
        <select
          value={params.value.viz}
          onChange={(e) => {
            setParam({ viz: e.target.value });
          }}
        >
          {["heatmap", "scribbles"].map((type) => (
            <option value={type.toLowerCase()}>View as {type}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
