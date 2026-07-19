const STAR = '★';

function Star({ fill, size, onPick }) {
  const handleClick = onPick
    ? (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const half = (e.clientX - rect.left) < rect.width / 2 ? 0.5 : 1;
        onPick(half);
      }
    : undefined;

  return (
    <span
      onClick={handleClick}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: size,
        height: size,
        lineHeight: 1,
        fontSize: size,
        cursor: onPick ? 'pointer' : 'default',
      }}
    >
      <span style={{ position: 'absolute', inset: 0, color: 'var(--bd-2)' }}>{STAR}</span>
      <span style={{ position: 'absolute', inset: 0, color: '#c2542d', overflow: 'hidden', width: `${fill * 100}%`, whiteSpace: 'nowrap' }}>{STAR}</span>
    </span>
  );
}

// value: 0-5 in 0.5 steps. onChange, if given, makes stars clickable (half-precision).
function RatingStars({ value, onChange, size = 16 }) {
  return (
    // position:relative so this stacks above an absolutely-positioned
    // sibling (e.g. a card's banner image) regardless of DOM order —
    // CSS paints positioned elements above static ones unconditionally.
    <span style={{ position: 'relative', display: 'inline-flex', gap: 1 }}>
      {[0, 1, 2, 3, 4].map(i => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <Star
            key={i}
            fill={fill}
            size={size}
            onPick={onChange ? (half) => onChange(i + half) : undefined}
          />
        );
      })}
    </span>
  );
}

export default RatingStars;
