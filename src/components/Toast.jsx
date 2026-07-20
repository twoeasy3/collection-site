// Transient status message, bottom-center (lifted above the mobile nav bar).
function Toast({ toast, isMobile }) {
  if (!toast.visible) return null;
  return (
    <div style={{ position: 'fixed', bottom: isMobile ? '66px' : '30px', left: '50%', transform: 'translateX(-50%)', backgroundColor: toast.type === 'error' ? '#dc3545' : '#28a745', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 9999, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
      {toast.message}
    </div>
  );
}

export default Toast;
