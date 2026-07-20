// DARK/LIGHT segmented toggle, shared by the mobile sidebar header and the
// desktop view controls (`grow` stretches it to fill a flex row).
function ThemeToggle({ theme, setTheme, grow = false }) {
  const btn = (value, label) => (
    <button onClick={() => setTheme(value)} style={{ ...(grow ? { flex: 1, padding: '4px' } : { padding: '4px 8px' }), fontSize: '0.7em', fontWeight: 'bold', backgroundColor: theme === value ? '#555' : 'transparent', color: theme === value ? '#fff' : '#999', border: 'none', cursor: 'pointer' }}>{label}</button>
  );
  return (
    <div style={{ display: 'flex', ...(grow ? { flex: 1 } : {}), border: '1px solid #bbb', borderRadius: '4px', overflow: 'hidden' }}>
      {btn('dark', 'DARK')}
      {btn('light', 'LIGHT')}
    </div>
  );
}

export default ThemeToggle;
