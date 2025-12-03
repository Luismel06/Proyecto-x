import { useState } from "react";
import HomePage from "./pages/HomePage.jsx";
import VideoPage from "./pages/VideoPage.jsx";
import "./App.css";

function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  const handleOpenVideo = (video) => {
    setSelectedVideo(video);
    setCurrentPage("video");
  };

  const goHome = () => {
    setCurrentPage("home");
    setSelectedVideo(null);
  };

  return (
    <div className="app-root">
      <div className="app-shell">
        {/* Navbar simple */}
        <header className="navbar">
          <div className="nav-logo">
            <div className="nav-mark">PX</div>
            <div>
              <div className="nav-title">Proyecto X</div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                Sales Video Academy
              </div>
            </div>
          </div>
          <div className="nav-chip">Entrenamiento para vendedores de EE. UU.</div>
        </header>

        {currentPage === "home" && (
          <HomePage
            onOpenVideo={handleOpenVideo}
            userEmail={userEmail}
            setUserEmail={setUserEmail}
          />
        )}

        {currentPage === "video" && selectedVideo && (
          <VideoPage
            video={selectedVideo}
            userEmail={userEmail}
            goHome={goHome}
          />
        )}
      </div>
    </div>
  );
}

export default App;
