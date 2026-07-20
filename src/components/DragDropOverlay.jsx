import { useState } from 'react';

// Four-zone drop overlay for image processing (shown while dragging files).
// Owns the highlighted-zone state; App only tracks whether a drag is active.
function DragDropOverlay({ onClose, onDropFull, onDropBrightness, onDropMonster, onDropSensitive }) {
  const [dragTarget, setDragTarget] = useState(null);

  const handleOverlayDragLeave = (e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget)) { onClose(); setDragTarget(null); } };
  const handleHalfDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragTarget(null); };
  const makeDrop = (upload) => async (e) => { e.preventDefault(); onClose(); setDragTarget(null); upload(Array.from(e.dataTransfer.files)); };

  return (
    <div onDragLeave={handleOverlayDragLeave} onDragOver={(e) => e.preventDefault()} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '26%', display: 'flex', borderBottom: '4px dashed rgba(255,255,255,0.5)' }}>
        <div onDragEnter={() => setDragTarget('monster')} onDragLeave={handleHalfDragLeave} onDrop={makeDrop(onDropMonster)} onDragOver={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '16px', backgroundColor: dragTarget === 'monster' ? 'rgba(140,50,180,0.95)' : 'rgba(110,30,150,0.85)', borderRight: '4px dashed rgba(255,255,255,0.5)', outline: dragTarget === 'monster' ? '6px dashed #fff' : '6px dashed rgba(255,255,255,0.4)', outlineOffset: '-10px', transition: 'background-color 0.15s' }}>
          <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 'bold', pointerEvents: 'none', margin: 0 }}>🚛 Monster Truck</h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', pointerEvents: 'none', margin: 0 }}>Wheels offset · body visible · (1) only</p>
        </div>
        <div onDragEnter={() => setDragTarget('sensitive')} onDragLeave={handleHalfDragLeave} onDrop={makeDrop(onDropSensitive)} onDragOver={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '16px', backgroundColor: dragTarget === 'sensitive' ? 'rgba(180,100,0,0.95)' : 'rgba(210,120,0,0.85)', borderLeft: '4px dashed rgba(255,255,255,0.5)', outline: dragTarget === 'sensitive' ? '6px dashed #fff' : '6px dashed rgba(255,255,255,0.4)', outlineOffset: '-10px', transition: 'background-color 0.15s' }}>
          <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 'bold', pointerEvents: 'none', margin: 0 }}>Sensitive Detection</h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', pointerEvents: 'none', margin: 0 }}>White/light vehicles · (1) only</p>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex' }}>
        <div onDragEnter={() => setDragTarget('brightness')} onDragLeave={handleHalfDragLeave} onDrop={makeDrop(onDropBrightness)} onDragOver={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', backgroundColor: dragTarget === 'brightness' ? 'rgba(25,140,50,0.92)' : 'rgba(33,160,64,0.82)', borderRight: '4px dashed rgba(255,255,255,0.5)', outline: dragTarget === 'brightness' ? '6px dashed #fff' : '6px dashed rgba(255,255,255,0.4)', outlineOffset: '-10px', transition: 'background-color 0.15s' }}>
          <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 'bold', pointerEvents: 'none', margin: 0 }}>Brightness Only</h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', pointerEvents: 'none', margin: 0 }}>No crop or resize</p>
        </div>
        <div onDragEnter={() => setDragTarget('full')} onDragLeave={handleHalfDragLeave} onDrop={makeDrop(onDropFull)} onDragOver={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', backgroundColor: dragTarget === 'full' ? 'rgba(0,100,220,0.92)' : 'rgba(0,123,255,0.82)', borderLeft: '4px dashed rgba(255,255,255,0.5)', outline: dragTarget === 'full' ? '6px dashed #fff' : '6px dashed rgba(255,255,255,0.4)', outlineOffset: '-10px', transition: 'background-color 0.15s' }}>
          <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 'bold', pointerEvents: 'none', margin: 0 }}>Full Process</h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', pointerEvents: 'none', margin: 0 }}>Crop · resize · adjust brightness</p>
        </div>
      </div>
    </div>
  );
}

export default DragDropOverlay;
