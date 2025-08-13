import "./hud.css";
export default function Hud({ title, date }) {
  return (
    <div class="womo-hud">
      <h1>{title}</h1>
      <p>{date}</p>
    </div>
  );
}
