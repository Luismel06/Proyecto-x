import VideoCard from "../components/VideoCard.jsx";

const MOCK_VIDEOS = [
  {
    id: 1,
    titulo: "Módulo 1 · Script que vende",
    descripcion: "Aprende el guion exacto que usan los top sellers para abrir llamadas y romper el hielo con clientes de Estados Unidos.",
    precio: 10
  },
  {
    id: 2,
    titulo: "Módulo 2 · Cierre avanzado",
    descripcion: "Técnicas de cierre, manejo de objeciones y follow-up para no dejar dinero en la mesa.",
    precio: 15
  }
];

export default function HomePage({ onOpenVideo, userEmail, setUserEmail }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="badge">Plataforma de videos exclusivos</div>
          <h1 className="title">Entrena a tus vendedores como los top del mercado</h1>
          <p className="subtitle">
            Proyecto X es una biblioteca de entrenamientos en video diseñada para
            equipos que venden a clientes de Estados Unidos. Acceso rápido, ejemplos
            reales y foco en resultados.
          </p>
        </div>
      </div>

      <div className="layout-two-columns">
        {/* Columna izquierda: correo + lista de módulos */}
        <div>
          <div className="input-group">
            <label className="input-label">Correo del vendedor</label>
            <input
              type="email"
              className="input-field"
              placeholder="vendedor@tuempresa.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
            <p className="small-text">
              Usamos este correo para asociar el acceso a los módulos que compre.
              Puede volver cuando quiera usando el mismo correo.
            </p>
          </div>

          <div className="video-list-header">
            <div>
              <div className="video-list-title">Módulos disponibles</div>
              <div className="video-list-subtitle">
                Haz clic en un módulo para ver los detalles y comprar el acceso.
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1rem", display: "grid", gap: "0.9rem" }}>
            {MOCK_VIDEOS.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onOpen={() => onOpenVideo(video)}
              />
            ))}
          </div>
        </div>

        {/* Columna derecha: explicación general de la plataforma */}
        <div className="video-preview">
          <span className="video-preview-tag">Para equipos de ventas</span>

          <p className="video-title">¿Qué es Proyecto X?</p>
          <p className="video-description">
            Imagina que cada nuevo vendedor entra con los mismos scripts, objeciones
            y cierres que usan tus mejores closers. Proyecto X convierte tu
            experiencia en una biblioteca de videos cortos y accionables.
          </p>

          <div
            style={{
              borderRadius: "0.9rem",
              border: "1px solid rgba(148,163,184,0.4)",
              height: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.85rem",
              color: "var(--muted)",
              textAlign: "center",
              padding: "0 1rem"
            }}
          >
            Aquí luego puedes poner un video de presentación o un demo de pantalla
            mostrando cómo funciona la plataforma.
          </div>

          <p className="small-text">
            Los módulos están pensados para vendedores que atienden clientes en
            inglés, cobran en dólares y necesitan ejemplos prácticos, no teoría
            aburrida.
          </p>
        </div>
      </div>
    </div>
  );
}
