import { useEffect, useState } from "react";
import VideoCard from "../components/VideoCard.jsx";
import { getVideos } from "../api.js";

export default function HomePage({ onOpenVideo, userEmail, setUserEmail }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const data = await getVideos();
        setVideos(data);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar el catálogo de videos.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  return (
    <div className="card">
      {/* ... header y texto igual que antes ... */}

      <div className="layout-two-columns">
        <div>
          {/* input de email igual que antes */}

          <div className="video-list-header">
            <div>
              <div className="video-list-title">Módulos disponibles</div>
              <div className="video-list-subtitle">
                Haz clic en un módulo para ver los detalles y comprar el acceso.
              </div>
            </div>
          </div>

          {loading && <p style={{ marginTop: "1rem" }}>Cargando catálogo...</p>}
          {error && (
            <p style={{ marginTop: "1rem", color: "#fca5a5" }}>{error}</p>
          )}

          {!loading && !error && (
            <div
              style={{
                marginTop: "1rem",
                display: "grid",
                gap: "0.9rem",
              }}
            >
              {videos.length === 0 && (
                <p className="small-text">
                  Aún no hay videos en el catálogo. Agrega algunos en Supabase.
                </p>
              )}

              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onOpen={() => onOpenVideo(video)}
                />
              ))}
            </div>
          )}
        </div>

        {/* columna derecha (qué es Proyecto X) se queda igual */}
      </div>
    </div>
  );
}

