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
      <section className="catalog-layout">
        {/* Left column: email, search, and list */}
        <div className="catalog-main">
          <header className="catalog-header">
            <h2>Available Modules</h2>
            <p>Click on a module to view details and purchase access.</p>
          </header>

          <div className="catalog-controls">
            <div className="control-group">
              <label htmlFor="email">Email to access the modules</label>
              <input
                id="email"
                type="email"
                placeholder="your-email@example.com"
                value={userEmail}
                onChange={handleEmailChange}
              />
              <small>
                We will use this email to recognize your purchases and unlock the
                videos automatically.
              </small>
            </div>

            <div className="control-group">
              <label htmlFor="search">Search module</label>
              <input
                id="search"
                type="text"
                placeholder="Type the name of the module..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading && <p style={{ marginTop: "1rem" }}>Loading catalog...</p>}

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

        {/* Right column: image + text */}
        <aside className="catalog-aside">
          <div className="catalog-hero-card">
            <img
              src="/sales-hero.jpg"
              alt="Sales training for agents working with U.S. clients"
            />
            <div className="hero-text">
              <h3>Sales Video Academy</h3>
              <p>
                Hands-on training designed for sales agents who work with customers
                in the United States. Learn scripts, objection handling, and proven
                closing techniques from real-world experience.
              </p>
              <p className="hero-sub">
                Start by entering your email and choosing the module that best fits
                your current level.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
