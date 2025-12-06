// frontend/src/components/Navbar.jsx
export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-left">
        <a href="/" className="brand">
          Sales Video Academy
        </a>
      </div>

      <div className="nav-right">
        <a href="/pricing.html">Pricing</a>
        <a href="/features.html">Features</a>
        <a href="/terms.html">Terms</a>
        <a href="/privacy.html">Privacy</a>
        <a href="/refund.html">Refunds</a>
      </div>
    </nav>
  );
}
