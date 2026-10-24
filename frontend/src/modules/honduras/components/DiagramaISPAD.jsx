import ispadImg from "../assets/objetivosGlucosa.jpg";

export default function DiagramaISPAD() {
  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <img
        src={ispadImg}
        alt="Diagrama ISPAD - Objetivos de control glucémico"
        style={{ width: "100%", maxWidth: 480, height: "auto", objectFit: "contain" }}
      />
    </div>
  );
}