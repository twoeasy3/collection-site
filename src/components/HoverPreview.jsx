import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const HoverPreview = React.memo(({ imgUrl, fallbackUrl, altText }) => {
  const [pos, setPos] = useState(null);
  const thumbRef = useRef(null);

  const previewWidth = 400;
  const previewHeight = 158;

  // Imperatively reset src so the browser fetches the new file even if the
  // old URL is in the in-memory cache (common after uploads).
  useEffect(() => {
    if (thumbRef.current) {
      thumbRef.current.style.display = 'block';
      thumbRef.current.src = '';
      thumbRef.current.src = imgUrl;
    }
  }, [imgUrl]);

  const handleMouseEnter = useCallback((e) => {
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e) => {
    cancelAnimationFrame(HoverPreview._raf);
    HoverPreview._raf = requestAnimationFrame(() => {
      setPos({ x: e.clientX, y: e.clientY });
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(HoverPreview._raf);
    setPos(null);
  }, []);

  const offsetX = pos
    ? (pos.x + 15 + previewWidth > window.innerWidth ? pos.x - previewWidth - 15 : pos.x + 15)
    : 0;
  const offsetY = pos
    ? (pos.y + 15 + previewHeight > window.innerHeight ? pos.y - previewHeight - 15 : pos.y + 15)
    : 0;

  return (
    <>
      <div
        style={{ width: '90px', height: '35px', backgroundColor: 'var(--bg-surface)', borderRadius: '2px', overflow: 'hidden', cursor: 'zoom-in' }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <img
          ref={thumbRef}
          key={imgUrl}
          src={imgUrl}
          alt={altText}
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={(e) => { e.target.src = fallbackUrl; }}
        />
      </div>

      {pos && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0,
          transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
          zIndex: 99999, backgroundColor: 'var(--bg)', padding: '4px',
          border: '2px solid var(--bd-3)', borderRadius: '6px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.9)', pointerEvents: 'none',
          width: `${previewWidth}px`, aspectRatio: '8 / 3',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <img
            key={imgUrl}
            src={imgUrl}
            alt="Preview"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
            onError={(e) => { e.target.src = fallbackUrl; }}
          />
        </div>,
        document.body
      )}
    </>
  );
});
HoverPreview._raf = null;

export default HoverPreview;
