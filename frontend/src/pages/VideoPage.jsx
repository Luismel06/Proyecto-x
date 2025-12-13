import { useEffect, useState } from "react";
import { createCheckout, checkAccess } from "../api.js";

export default function VideoPage({ video, userEmail, goHome }) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    const fetchAccess = async () => {
      try {
        const res = await checkAccess(userEmail, video.id);
        setHasAccess(!!res.hasAccess);
      } catch (err) {
        console.error(err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    fetchAccess();
  }, [userEmail, video.id]);

  const handleCheckout = async () => {
    if (!userEmail) {
      alert("You must enter your email on the main screen.");
      return;
    }

    try {
      setCheckoutLoading(true);
      const res = await createCheckout(userEmail, video.id);
      window.location.href = res.paymentUrl;
    } catch (err) {
      console.error(err);
      alert(err?.message || "Error initiating the payment.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="card">
      <button className="btn-secondary" onClick={goHome}>
        ← Back to catalog
      </button>

      <div className="layout-two-columns" style={{ marginTop: "1.5rem" }}>
        <div>
          <div className="badge">Exclusive Module</div>

          <h2 className="title" style={{ fontSize: "1.5rem", marginTop: "0.7rem" }}>
            {video.titulo}
          </h2>

          <p className="video-description">{video.descripcion}</p>

          <div className="price-row">
            <span className="price-main">${video.precio}</span>
            <span className="price-sub">One-time payment · unlimited access</span>
          </div>

          {loading ? (
            <p>Checking access...</p>
          ) : hasAccess ? (
            <>
              <div className="status-pill status-ok">
                <span>✓</span>
                <span>You already have access to this module</span>
              </div>

              <p className="small-text">
                This video is linked to <strong>{userEmail}</strong>. You can return anytime using the same email.
              </p>

              {/* ✅ AQUÍ MOSTRAMOS EL VIDEO */}
              <div style={{ marginTop: "1rem" }}>
                {video.url ? (
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 9",
                      borderRadius: "14px",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <iframe
                      src={video.url}
                      title={video.titulo}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <p className="small-text" style={{ color: "#fca5a5" }}>
                    Video URL not found for this module. Check `url_privada` in Supabase.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="status-pill status-bad">
                <span>✕</span>
                <span>You don't have access to this module yet</span>
              </div>
              <p className="small-text">
                Complete the card payment and the system will automatically unlock the video once Paddle confirms the transaction.
              </p>

              <div className="button-row">
                <button
                  onClick={handleCheckout}
                  className="btn-primary"
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? "Redirecting to payment..." : "Buy access now"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="video-preview-card">
          <span className="badge">Content Preview</span>

          <div className="video-player-placeholder">
            {/* si no tiene acceso, preview locked; si tiene, igual puedes dejarlo */}
            <img
              src={hasAccess ? "/unlocked.svg" : "/preview-locked.png"}
              alt="Preview of the module"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
