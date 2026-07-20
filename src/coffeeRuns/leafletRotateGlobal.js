import * as L from 'leaflet';

// leaflet-rotate's bundle patches the Leaflet classes via a bare global `L`
// reference rather than importing 'leaflet' itself, so it has to find the
// same L instance react-leaflet uses already sitting on window before it runs.
if (typeof window !== 'undefined' && !window.L) window.L = L;
