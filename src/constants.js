import fictionalData from './fictional_makes.json';
import makesData from '../makes.json';

const REMOTE_BASE = 'https://pingmathehippo.com';
// Local (same-origin) images only exist in the Vite dev server, which serves
// them from the filesystem; the deployed site keeps them in R2 behind
// REMOTE_BASE. A phone always hits the deployed site, so the admin app must
// use remote images there too — otherwise every image 404s. Public /display
// is always remote; desktop admin keeps the local/toggle behaviour for dev.
const isMobileWidth = window.innerWidth < 700;
export const BASE_PATH =
  window.location.pathname.startsWith('/display') ? REMOTE_BASE
  : isMobileWidth ? REMOTE_BASE
  : localStorage.getItem('useRemoteImages') === 'true' ? REMOTE_BASE
  : '';

export const FICTIONAL_MAKES = new Set(Array.isArray(fictionalData) ? fictionalData : []);

// Initialised from static bundle; overwritten from D1 on load
export const MAKE_COUNTRY = new Map(makesData.map(m => [m.Name, m.Country]));

export const thStyle = { padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-raised)', color: 'var(--tx)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '2px solid var(--bd-2)' };
export const tdStyle = { padding: '4px 8px', borderBottom: '1px solid var(--bd)', color: 'var(--tx-2)', verticalAlign: 'middle', textOverflow: 'ellipsis', overflow: 'hidden' };
