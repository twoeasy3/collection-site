import fictionalData from './fictional_makes.json';
import makesData from '../makes.json';

const REMOTE_BASE = 'https://pingmathehippo.com';
export const BASE_PATH = window.location.pathname.startsWith('/display')
  ? REMOTE_BASE
  : localStorage.getItem('useRemoteImages') === 'true' ? REMOTE_BASE : '';

export const FICTIONAL_MAKES = new Set(Array.isArray(fictionalData) ? fictionalData : []);

// Initialised from static bundle; overwritten from D1 on load
export const MAKE_COUNTRY = new Map(makesData.map(m => [m.Name, m.Country]));

export const thStyle = { padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-raised)', color: 'var(--tx)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '2px solid var(--bd-2)' };
export const tdStyle = { padding: '4px 8px', borderBottom: '1px solid var(--bd)', color: 'var(--tx-2)', verticalAlign: 'middle', textOverflow: 'ellipsis', overflow: 'hidden' };
