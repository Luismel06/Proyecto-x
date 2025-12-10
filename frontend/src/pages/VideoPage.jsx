// frontend/src/pages/VideoPage.jsx
import { useEffect, useState } from "react";
import { createCheckout, checkAccess } from "../api.js";

export default function VideoPage({ video, userEmail, goHome }) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // 🔹 Verificar acceso al cargar la página
  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    const fetchAccess = async () => {
      try {
        console.log("[VideoPage] Checking access for", userEmail, "video", video.id);
        const res = await checkAccess(userEmail, video.id);
        console.log("[VideoPage] /access/check response:", res);
        setHasAccess(res.hasAccess);
      } catch (err) {
        console.error("[VideoPage] Error checking access:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccess();
  }, [userEmail, video.id]);

  // 🔹 Handler de checkout
  const handleCheckout = async () => {
    console.log("[VideoPage] handleCheckout clicked", {
      userEmail,
      videoId: video.id,
    });

    if (!userEmail) {
      alert("You must enter your email on the main screen before buying.");
      return;
    }

    try {
      setCheckoutLoading(true);
      console.log("[VideoPage] Calling createCheckout...");
      const res = await createCheckout(userEmail, video.id);
      console.log("[VideoPage] createCheckout response:", res);

      if (!res || !res.paymentUrl) {
        alert("Could not obtain the payment link from Paddle.");
        return;
      }

      // 🔹 Redirigir a Paddle
      window.location.href = res.paymentUrl;
    } catch (err) {
      console.error("[VideoPage] Error initiating payment:", err);
      alert(err.message || "Error initiating the payment.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="card">
      <button type="button" className="btn-secondary" onClick={goHome}>
        ← Back to catalog
      </button>

      <div className="layout-two-columns" style={{ marginTop: "1.5rem" }}>
        <div>
          <div className="badge">Exclusive Module</div>

          <h2
            className="title"
            style={{ fontSize: "1.5rem", marginTop: "0.7rem" }}
          >
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
                This video is already linked to <strong>{userEmail}</strong>. You can
                return anytime using the same email.
              </p>
            </>
          ) : (
            <>
              <div className="status-pill status-bad">
                <span>✕</span>
                <span>You don't have access to this module yet</span>
              </div>
              <p className="small-text">
                Complete the card payment and the system will automatically unlock
                the video once Paddle confirms the transaction.
              </p>

              <div className="button-row">
                <button
                  type="button"
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

        <div className="video-preview-card">
          <span className="badge">Content Preview</span>

          <div className="video-player-placeholder">
            <img
              src="/preview-locked.png"
              alt="Preview of the exclusive module from Sales Video Academy"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
