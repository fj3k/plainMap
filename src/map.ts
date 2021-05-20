import { newID } from "./key.js";

export enum MapType {
    Terrain = 'terrain',
    Satellite = 'satellite',
    Roadmap = 'roadmap'
}

export type JSONBounds = {
    north: number,
    south: number,
    east: number,
    west: number
}

export type JSONLatLng = {
    lat: number,
    lng: number
}


export class MapWrapper {
    map: google.maps.Map;
    mapEl: HTMLElement;
    ready: boolean = false;
    readyCallback: () => void;
    eventListeners: {[index: string]: google.maps.MapsEventListener} = {};

    constructor(el: HTMLElement, params: google.maps.MapOptions, callback: () => void) {
        this.mapEl = el;
        this.map = new google.maps.Map(this.mapEl, params)
        this.readyCallback = callback;
        this.initMap();
    }

    initMap() {
        var me = this;
        google.maps.event.addListenerOnce(this.map, 'tilesloaded', function() { me.ready = true; me.readyCallback() });
    }

    getBounds() {
        return this.map.getBounds();
    }

    fitBounds(bounds: Bounds | JSONBounds) {
        this.map.fitBounds(bounds);
    }

    getZoom(): number {
        return this.map.getZoom() || 0;
    }

    getProjection() {
        return this.map.getProjection();
    }

    setMapType(mapType: MapType | undefined) {
        if (!mapType) return;

        this.map.setMapTypeId(mapType);
    }

    listen(what: string, callback: (event: any) => void, listenerID?: string) {
        if (!listenerID) listenerID = newID();
        this.eventListeners[listenerID] = google.maps.event.addListener(this.map, what, callback);
        return listenerID;
    }

    listenObject(object: Mapable, what: string, callback: (event: any) => void, listenerID?: string) {
        if (!listenerID) listenerID = newID();
        this.eventListeners[listenerID] = google.maps.event.addListener(object, what, callback);
        return listenerID;
    }

    unlisten(listenerID: string) {
        this.eventListeners[listenerID].remove();
    }

    trigger(what: string, event: any) {
        google.maps.event.trigger(this.map, what, event);
    }

    triggerObject(object: Mapable, what: string, event: any) {
        google.maps.event.trigger(object, what, event);
    }

    add(object: Mapable) {
        object.setMap(this.map);
    }

    remove(object: Mapable) {
        object.setMap(null);
    }

    /**
     * 
     * @param list 
     * @returns 
     */
    boundsFromLatLngList(list: LatLng[]) {
        if (list.length == 0) return null;
      
        var x0 = null, x1 = null, y0 = null, y1 = null;
        for (var latLng of list) {
            if (x0 === null || x1 === null || y0 === null || y1 === null) {
                x0 = x1 = latLng.lat();
                y0 = y1 = latLng.lng();
            } else {
                if (latLng.lat() > x1) x1 = latLng.lat();
                if (latLng.lat() < x0) x0 = latLng.lat();
                if (latLng.lng() > y1) y1 = latLng.lng();
                if (latLng.lng() < y0) y0 = latLng.lng();
            }
        }
        return new Bounds(new LatLng(x0 as number, y0 as number), new LatLng(x1 as number, y1 as number));
    }

    /**
     * 
     */
    pointAtOffset(x: number, y: number) {
        var bounds = this.getBounds();
        if (!bounds) return null;
 
        var ne = bounds.getNorthEast(), sw = bounds.getSouthWest();
        var north = ne.lat(), south = sw.lat(), east = ne.lng(), west = sw.lng();
        var mapOffsets = this.mapEl.getBoundingClientRect();
        var latPerPx = (north - south) / mapOffsets.height;
        var lngPerPx = (east - west) / mapOffsets.width;
        var lat = north - latPerPx * (y - mapOffsets.top);
        var lng = west + lngPerPx * (x - mapOffsets.left);

        return new LatLng(lat, lng);
    }
  
    computeDistanceBetween(a: LatLng, b: LatLng, r?: number) {
        return google.maps.geometry.spherical.computeDistanceBetween(a, b, r);
    }
    computeHeading(a: LatLng, b: LatLng) {
        return google.maps.geometry.spherical.computeHeading(a, b);
    }
}

/**
 * Map label overlay.
 *
 * Puts a styleable div on the map.
 */
export class MapLabel extends google.maps.OverlayView {
    position: google.maps.LatLng;
    content: HTMLDivElement;
    container: HTMLDivElement;

    constructor(params: any) {
        super();
        this.position = params.position;
    
        const content = document.createElement('div');
        content.classList.add(params.class ? params.class : 'mapLabel');
        content.innerHTML = String(params.label).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br/>');
        if (params.style) {
            for (var k of Object.keys(params.style)) {
                (content.style as any)[k] = params.style[k];
            }
        }
    
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.cursor = 'pointer';
        container.appendChild(content);
    
        this.content = content;
        this.container = container;
    }
  
    onAdd() {
        var panes = this.getPanes();
        if (panes === null) return;

        panes.floatPane.appendChild(this.container);
    }
  
    onRemove() {
        this.container.remove();
    }
  
    draw() {
        const pos = this.getProjection().fromLatLngToDivPixel(this.position);
        if (pos === null) return;

        this.container.style.left = pos.x + 'px';
        this.container.style.top = pos.y + 'px';
    }
  
    addClass(clas: string) {
        this.content.classList.add(clas);
    }
  
    removeClass(clas: string) {
        this.content.classList.remove(clas);
    }
  }
  
  /**
   * Container for map elements which allows functions to be called on all of them.
   */
  export class MapContainer {
    items: Mapable[] = [];
  
    setMap(map: google.maps.Map) {
      for (var i of this.items) {
        (i as any).setMap(map);
      }
    }
  
    addClass(clas: string) {
      for (var i of this.items) {
        if (typeof (i as any).addClass === 'function') (i as any).addClass(clas);
      }
    }
  
    removeClass(clas: string) {
      for (var i of this.items) {
        if (typeof (i as any).removeClass === 'function') (i as any).removeClass(clas);
      }
    }
  }

export interface Mapable {
    setMap(map: google.maps.Map | null): void;
}

export class LatLng extends google.maps.LatLng {}
export class Bounds extends google.maps.LatLngBounds {}

export class Marker extends google.maps.Marker {}
export class Rectangle extends google.maps.Rectangle {}
export class Polygon extends google.maps.Polygon {}
export class Polyline extends google.maps.Polyline {}

export class Symbols {
    static Circle = google.maps.SymbolPath.CIRCLE;

}