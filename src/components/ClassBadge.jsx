import { CLASS_COLORS, CLASS_TEXT, CLASS_LABELS } from '../utils/carStats';

// Class letter + rating pill. `size` is 'card' (tiny, overlaid on the side
// image) or 'panel' (larger, in the detail pane).
function ClassBadge({ cls, rating, size = 'card', style }) {
  if (!cls) return null;
  const bg = CLASS_COLORS[cls] || CLASS_COLORS.U;
  const fg = CLASS_TEXT[cls] || '#fff';
  const panel = size === 'panel';
  return (
    <span title={`${CLASS_LABELS[cls] || cls} · rating ${rating}`} style={{
      display: 'inline-flex', alignItems: 'stretch', borderRadius: panel ? '6px' : '4px', overflow: 'hidden',
      fontWeight: 800, lineHeight: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.45)', userSelect: 'none', ...style,
    }}>
      <span style={{ backgroundColor: bg, color: fg, padding: panel ? '6px 10px' : '2px 5px', fontSize: panel ? '1.3em' : '0.7em', display: 'flex', alignItems: 'center' }}>{cls}</span>
      {rating != null && cls !== 'U' && (
        <span style={{ backgroundColor: 'rgba(20,20,20,0.85)', color: '#fff', padding: panel ? '6px 10px' : '2px 5px', fontSize: panel ? '1.05em' : '0.65em', display: 'flex', alignItems: 'center', fontVariantNumeric: 'tabular-nums' }}>{rating}</span>
      )}
    </span>
  );
}

export default ClassBadge;
