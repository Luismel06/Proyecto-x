export default function VideoCard({ video, onOpen }) {
  return (
    <button
      onClick={onOpen}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: "0.9rem",
        border: "1px solid rgba(148,163,184,0.4)",
        background:
          "radial-gradient(circle at top left, #111827 0, #020617 60%, #020617 100%)",
        padding: "0.85rem 1rem",
        cursor: "pointer",
        color: "white"

      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
            {video.titulo}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            {video.descripcion}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="price-main">${video.precio}</div>
          <div className="price-sub">One Time Payment</div>
        </div>
      </div>
    </button>
  );
}
