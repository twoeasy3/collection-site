// Fullscreen hero-image lightbox (mobile taps the small hero to open this).
function HeroPopup({ src, alt, fallbackSrc, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.93)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={src}
        alt={alt}
        onError={(e) => { e.target.onerror = null; e.target.src = fallbackSrc; }}
        style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}
      />
    </div>
  );
}

export default HeroPopup;
