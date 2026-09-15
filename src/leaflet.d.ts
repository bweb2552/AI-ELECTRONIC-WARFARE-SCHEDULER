// Leaflet loaded via CDN - type declarations for the global L object
// Using `any` for chaining methods since CDN-loaded Leaflet has no TypeScript source
declare namespace L {
  interface LatLng { lat: number; lng: number; }
  type LatLngExpression = [number, number] | LatLng;

  class Map {
    constructor(el: string | HTMLElement, options?: Record<string, any>);
    remove(): any;
    setView(latlng: LatLngExpression, zoom: number, options?: Record<string, any>): any;
    zoomIn(): any;
    zoomOut(): any;
    addLayer(layer: any): any;
    removeLayer(layer: any): any;
    eachLayer(fn: (layer: any) => void, context?: any): any;
    getCenter(): LatLng;
    getZoom(): number;
    getContainer(): HTMLElement;
    getBounds(): any;
    fitBounds(bounds: any, options?: Record<string, any>): any;
  }

  class TileLayer {
    constructor(urlTemplate: string, options?: Record<string, any>);
    addTo(map: any): any;
  }

  class Marker {
    constructor(latlng: LatLngExpression, options?: Record<string, any>);
    addTo(map: any): any;
    bindTooltip(content: string | (() => string), options?: Record<string, any>): any;
    on(type: string, fn: (e: any) => void): any;
  }

  class DivIcon {
    constructor(options?: { className?: string; html?: string | HTMLElement; iconSize?: [number, number]; iconAnchor?: [number, number] });
  }

  class Polyline {
    constructor(latlngs: LatLngExpression[], options?: Record<string, any>);
    addTo(map: any): any;
    bindTooltip(content: string, options?: Record<string, any>): any;
  }

  class LayerGroup {
    constructor(layers?: any[], options?: Record<string, any>);
    clearLayers(): any;
    addLayer(layer: any): any;
    removeLayer(layer: any): any;
    hasLayer(layer: any): boolean;
    getLayers(): any[];
    eachLayer(fn: (layer: any) => void, context?: any): any;
    addTo(map: any): any;
  }

  function map(el: string | HTMLElement, options?: Record<string, any>): Map;
  function tileLayer(urlTemplate: string, options?: Record<string, any>): TileLayer;
  function marker(latlng: LatLngExpression, options?: Record<string, any>): Marker;
  function divIcon(options?: { className?: string; html?: string | HTMLElement; iconSize?: [number, number]; iconAnchor?: [number, number] }): DivIcon;
  function polyline(latlngs: LatLngExpression[], options?: Record<string, any>): Polyline;
  function layerGroup(layers?: any[], options?: Record<string, any>): LayerGroup;
}
