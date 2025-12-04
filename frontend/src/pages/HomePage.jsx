// frontend/src/pages/HomePage.jsx
import { useEffect, useState } from "react";
import VideoCard from "../components/VideoCard.jsx";
import { getVideos } from "../api.js";

export default function HomePage({ onOpenVideo, userEmail, setUserEmail }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setUserEmail(value);
    localStorage.setItem("px_email", value);
  };

  const filteredVideos = videos.filter((v) =>
    v.titulo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="page">
      <section className="catalog-layout">
        {/* Columna izquierda: correo, búsqueda y lista */}
        <div className="catalog-main">
          <header className="catalog-header">
            <h2>Módulos disponibles</h2>
            <p>Haz clic en un módulo para ver los detalles y comprar el acceso.</p>
          </header>

          <div className="catalog-controls">
            <div className="control-group">
              <label htmlFor="email">Correo para acceder a los módulos</label>
              <input
                id="email"
                type="email"
                placeholder="tu-correo@ejemplo.com"
                value={userEmail}
                onChange={handleEmailChange}
              />
              <small>
                Usaremos este correo para reconocer tus compras y desbloquear los
                videos automáticamente.
              </small>
            </div>

            <div className="control-group">
              <label htmlFor="search">Buscar módulo</label>
              <input
                id="search"
                type="text"
                placeholder="Escribe el nombre del módulo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading && <p style={{ marginTop: "1rem" }}>Cargando catálogo...</p>}
          {error && (
            <p style={{ marginTop: "1rem", color: "#fca5a5" }}>{error}</p>
          )}

          {!loading && !error && (
            <div className="modules-list">
              {filteredVideos.length === 0 ? (
                <p className="small-text">
                  No encontramos módulos que coincidan con tu búsqueda.
                </p>
              ) : (
                filteredVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onOpen={() => onOpenVideo(video)} // 👈 igual que tu código viejo
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Columna derecha: imagen + texto */}
        <aside className="catalog-aside">
          <div className="catalog-hero-card">
            <img
              src="/sales-hero.jpg"
              alt="Entrenamiento de ventas para vendedores de EE. UU."
            />
            <div className="hero-text">
              <h3>Sales Video Academy</h3>
              <p>
                Entrenamientos prácticos diseñados para vendedores que trabajan con
                clientes en Estados Unidos. Aprende guiones, manejo de objeciones y
                cierres probados en campo real.
              </p>
              <p className="hero-sub">
                Comienza registrando tu correo y elige el módulo que más se adapta a
                tu nivel actual.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
