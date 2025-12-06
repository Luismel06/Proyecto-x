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
        setError("Failed to load the video catalog.");
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
      <div className="page-inner">
        {/* HEADER tipo pricing/features */}
        <header className="page-header">
          <h1 className="page-title">Choose the module that fits your next step</h1>
          <p className="page-subtitle">
            Enter your email, search the available modules and click on one of them
            to see the details and purchase lifetime access.
          </p>
        </header>

        {/* GRID principal: izquierda (form + lista) / derecha (hero) */}
        <section className="catalog-layout">
          {/* LEFT COLUMN */}
          <div className="catalog-main">
            {/* Controles de email + búsqueda */}
            <div className="catalog-controls">
              <div className="control-group">
                <label htmlFor="email">Email used to unlock your modules</label>
                <input
                  id="email"
                  type="email"
                  placeholder="your-email@example.com"
                  value={userEmail}
                  onChange={handleEmailChange}
                />
                <small>
                  We&apos;ll use this email to recognize your purchases and automatically
                  unlock your training videos.
                </small>
              </div>

              <div className="control-group">
                <label htmlFor="search">Search module</label>
                <input
                  id="search"
                  type="text"
                  placeholder="Type the module name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Lista de módulos */}
            <div className="catalog-header">
              <h2>Available modules</h2>
              <p>Click a module to see its details and start the checkout.</p>
            </div>

            {loading && (
              <p style={{ marginTop: "1rem" }}>Loading catalog...</p>
            )}

            {error && (
              <p style={{ marginTop: "1rem", color: "#fca5a5" }}>{error}</p>
            )}

            {!loading && !error && (
              <div className="modules-list">
                {filteredVideos.length === 0 ? (
                  <p className="small-text">
                    No modules found matching your search.
                  </p>
                ) : (
                  filteredVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onOpen={() => onOpenVideo(video)}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN – hero igual estilo que pricing/features */}
          <aside className="catalog-aside">
            <div className="catalog-hero-card">
              <img
                src="/sales-hero.jpg"
                alt="Sales training for agents working with U.S. clients"
              />
              <div className="hero-text">
                <h3>Sales Video Academy</h3>
                <p>
                  Hands-on video training designed for sales agents who work daily
                  with U.S. customers. Learn real scripts, objection handling and
                  closing techniques tested in live calls.
                </p>
                <p className="hero-sub">
                  Start by entering your email on the left, then choose the module
                  you want to unlock.
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
