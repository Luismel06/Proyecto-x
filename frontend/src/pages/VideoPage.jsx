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
        setHasAccess(res.hasAccess);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccess();
  }, [userEmail, video.id]);

  const handleCheckout = async () => {
    if (!userEmail) {
      alert("Debes ingresar tu correo en la pantalla principal.");
      return;
    }

    try {
      setCheckoutLoading(true);
      const res = await createCheckout(userEmail, video.id);
      // Por ahora seguimos redirigiendo a la URL del proveedor
      window.location.href = res.paymentUrl;
    } catch (err) {
      console.error(err);
      alert("Error al iniciar el pago");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="card">
      <button className="btn-secondary" onClick={goHome}>
        ← Volver al catálogo
      </button>

      <div className="layout-two-columns" style={{ marginTop: "1.5rem" }}>
        <div>
          <div className="badge">Módulo exclusivo</div>
          <h2 className="title" style={{ fontSize: "1.5rem", marginTop: "0.7rem" }}>
            {video.titulo}
          </h2>
          <p className="video-description">{video.descripcion}</p>

          <div className="price-row">
            <span className="price-main">${video.precio}</span>
            <span className="price-sub">Pago único · acceso ilimitado</span>
          </div>

          {loading ? (
            <p>Verificando acceso...</p>
          ) : hasAccess ? (
            <>
              <div className="status-pill status-ok">
                <span>✓</span>
                <span>Tienes acceso a este módulo</span>
              </div>
              <p className="small-text">
                Este video ya está vinculado a <strong>{userEmail}</strong>. Puedes
                volver cuando quieras usando el mismo correo.
              </p>
            </>
          ) : (
            <>
              <div className="status-pill status-bad">
                <span>✕</span>
                <span>No tienes acceso a este módulo aún</span>
              </div>
              <p className="small-text">
                Completa el pago con tarjeta y el sistema desbloqueará el video
                automáticamente.
              </p>

              <div className="button-row">
                <button
                  onClick={handleCheckout}
                  className="btn-primary"
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? "Redirigiendo al pago..." : "Comprar acceso ahora"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="video-preview">
          <span className="video-preview-tag">Vista del contenido</span>
          <div
            style={{
              borderRadius: "0.9rem",
              border: "1px solid rgba(148,163,184,0.4)",
              height: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.85rem",
              color: "var(--muted)",
              textAlign: "center",
              padding: "0 1rem"
            }}
          >
            Aquí va el reproductor con la URL privada del video de Proyecto X.
            Por ahora puedes dejar un placeholder mientras terminas la integración.
          </div>
        </div>
      </div>
    </div>
  );
}
