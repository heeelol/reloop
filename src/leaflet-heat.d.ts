// leaflet.heat ships no types. It attaches L.heatLayer() as a side effect.
// We import it for the side effect and access heatLayer via a cast in code.
declare module 'leaflet.heat'
