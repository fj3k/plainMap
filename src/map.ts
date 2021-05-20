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

/**
 * Wrapper around a mapping library.
 */
export abstract class MapWrapper {
    ready: boolean = false;

    static getMap(el: HTMLElement, params: MapOptions, callback: () => void) {
        return new GoogleMapWrapper(el, params, callback);
    }

    abstract getBounds(): Bounds | undefined;
    abstract fitBounds(bounds: Bounds | JSONBounds): void;
    abstract getZoom(): number;
    abstract setZoom(zoom: number): void;
    abstract getProjection(): Projection | undefined;
    abstract setMapType(mapType: MapType | undefined): void;
    abstract listen(what: string, callback: (event: any) => void, listenerID?: string): string;
    abstract listenObject(object: Mapable, what: string, callback: (event: any) => void, listenerID?: string): string;
    abstract unlisten(listenerID: string): void;
    abstract trigger(what: string, event: any): void;
    abstract triggerObject(object: Mapable, what: string, event: any): void;
    abstract add(object: Mapable): void;
    abstract remove(object: Mapable): void;
    abstract boundsFromLatLngList(list: LatLng[]): Bounds | undefined;
    abstract pointAtOffset(x: number, y: number): LatLng | undefined;
    abstract pointToOffset(point: LatLng): {x: number, y: number} | undefined;
    abstract computeDistanceBetween(a: LatLng, b: LatLng, r?: number): number;
    abstract computeHeading(a: LatLng, b: LatLng): number;
}

/**
 * Specific implementation for Google Maps
 */
class GoogleMapWrapper extends MapWrapper {
    map: google.maps.Map;
    mapEl: HTMLElement;
    ready: boolean = false;
    readyCallback: () => void;
    eventListeners: {[index: string]: google.maps.MapsEventListener} = {};

    constructor(el: HTMLElement, params: MapOptions, callback: () => void) {
        super();

        this.mapEl = el;
        this.map = new google.maps.Map(this.mapEl, params)
        this.readyCallback = callback;
        this.initMap();
    }

    /**
     * Steps after creating the map object, but before loaded.
     */
    initMap() {
        var me = this;
        google.maps.event.addListenerOnce(this.map, 'tilesloaded', function() { me.ready = true; me.readyCallback() });
    }

    /**
     * Returns the bounds shown by the map
     * @returns
     */
    getBounds(): Bounds | undefined {
        return this.map.getBounds();
    }

    /**
     * Zoom to fit bounds
     * @param bounds the bounds to fit to.
     */
    fitBounds(bounds: Bounds | JSONBounds) {
        this.map.fitBounds(bounds);
    }

    /**
     * Get the current zoom level
     * @returns
     */
    getZoom(): number {
        return this.map.getZoom() || 0;
    }

    /**
     * Set the zoom to level
     * @param zoom
     */
    setZoom(zoom: number) {
        this.map.setZoom(zoom);
    }

    /**
     * Get the current projection
     * @returns
     */
    getProjection(): Projection | undefined {
        return this.map.getProjection();
    }

    /**
     * Set the map type
     * @param mapType
     * @returns
     */
    setMapType(mapType: MapType | undefined) {
        if (!mapType) return;

        this.map.setMapTypeId(mapType);
    }

    /**
     * Listen for an event
     * @param what
     * @param callback
     * @param listenerID
     * @returns
     */
    listen(what: string, callback: (event: any) => void, listenerID?: string) {
        if (!listenerID) listenerID = newID();
        this.eventListeners[listenerID] = google.maps.event.addListener(this.map, what, callback);
        return listenerID;
    }

    /**
     * Listen for an event on an object
     * @param object
     * @param what
     * @param callback
     * @param listenerID
     * @returns
     */
    listenObject(object: Mapable, what: string, callback: (event: any) => void, listenerID?: string) {
        if (!listenerID) listenerID = newID();
        this.eventListeners[listenerID] = google.maps.event.addListener(object, what, callback);
        return listenerID;
    }

    /**
     * Remove a listener
     * @param listenerID
     */
    unlisten(listenerID: string) {
        this.eventListeners[listenerID].remove();
    }

    /**
     * Trigger an event
     * @param what
     * @param event
     */
    trigger(what: string, event: any) {
        google.maps.event.trigger(this.map, what, event);
    }

    /**
     * Trigger an event on an object
     * @param object
     * @param what
     * @param event
     */
    triggerObject(object: Mapable, what: string, event: any) {
        google.maps.event.trigger(object, what, event);
    }

    /**
     * Show an object on the map
     * @param object
     */
    add(object: Mapable) {
        object.setMap(this.map);
    }

    /**
     * Remove an object from the map
     * @param object
     */
    remove(object: Mapable) {
        object.setMap(null);
    }

    /**
     * Returns a bounds containing all the points in the list.
     * @param list
     * @returns
     */
    boundsFromLatLngList(list: LatLng[]): Bounds | undefined {
        if (list.length == 0) return;

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
     * Returns the LatLng at pixel offset x, y
     * @param x pixel relative to window
     * @param y pixel relative to window
     * @returns Latitude and longitude
     */
    pointAtOffset(x: number, y: number): LatLng | undefined {
        var bounds = this.getBounds();
        if (!bounds) return;

        var ne = bounds.getNorthEast(), sw = bounds.getSouthWest();
        var north = ne.lat(), south = sw.lat(), east = ne.lng(), west = sw.lng();
        var mapOffsets = this.mapEl.getBoundingClientRect();
        var latPerPx = (north - south) / mapOffsets.height;
        var lngPerPx = (east - west) / mapOffsets.width;
        var lat = north - latPerPx * (y - mapOffsets.top);
        var lng = west + lngPerPx * (x - mapOffsets.left);

        return new LatLng(lat, lng);
    }

    /**
     * Returns the pixel offset of a LatLng
     * @param point
     * @returns
     */
    pointToOffset(point: LatLng): {x: number, y: number} | undefined {
        var offset: {x: number, y: number} | undefined;
        var proj = this.getProjection();
        if (!proj) return;
        var p = proj.fromLatLngToPoint(point);
        if (p !== null) return p;
        return;
    }

    /**
     * Computes the distance (in metres) between two points (given radius r)
     * @param a point a
     * @param b point b
     * @param r radius
     * @returns distance in metres
     */
    computeDistanceBetween(a: LatLng, b: LatLng, r?: number): number {
        return google.maps.geometry.spherical.computeDistanceBetween(a, b, r);
    }

    /**
     * Computes the heading from point a to point b.
     * @param a point a
     * @param b point b
     * @returns the heading (from north)
     */
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

    /**
     * When adding
     * @returns
     */
    onAdd() {
        var panes = this.getPanes();
        if (panes === null) return;

        panes.floatPane.appendChild(this.container);
    }

    /**
     * When removing
     */
    onRemove() {
        this.container.remove();
    }

    /**
     * Position the div
     * @returns
     */
    draw() {
        const pos = this.getProjection().fromLatLngToDivPixel(this.position);
        if (pos === null) return;

        this.container.style.left = pos.x + 'px';
        this.container.style.top = pos.y + 'px';
    }

    /**
     * Add a CSS class to the div
     * @param clas
     */
    addClass(clas: string) {
        this.content.classList.add(clas);
    }

    /**
     * Remove a CSS class from the div
     * @param clas
     */
    removeClass(clas: string) {
        this.content.classList.remove(clas);
    }
  }

  /**
   * Container for map elements which allows functions to be called on all of them.
   */
  export class MapContainer {
    items: Mapable[] = [];

    /**
     * Calls setMap on all the items.
     * @param map
     */
    setMap(map: google.maps.Map) {
        for (var i of this.items) {
            (i as any).setMap(map);
        }
    }

    /**
     * Calls addClass on all the items that have that function.
     * @param map
     */
    addClass(clas: string) {
        for (var i of this.items) {
            if (typeof (i as any).addClass === 'function') (i as any).addClass(clas);
        }
    }

    /**
     * Calls removeClass on all the items that have that function.
     * @param map
     */
    removeClass(clas: string) {
        for (var i of this.items) {
            if (typeof (i as any).removeClass === 'function') (i as any).removeClass(clas);
        }
    }
}

/**
 * Anything that can be put on a map
 */
export interface Mapable {
    setMap(map: google.maps.Map | null): void;
}

///// Overrides of Google objects

interface MapOptions extends google.maps.MapOptions {}
interface Projection extends google.maps.Projection {}

export class LatLng extends google.maps.LatLng {}
export class Bounds extends google.maps.LatLngBounds {}

export class Marker extends google.maps.Marker {}
export class Rectangle extends google.maps.Rectangle {}
export class Polygon extends google.maps.Polygon {}
export class Polyline extends google.maps.Polyline {}

export class Symbols {
    static Circle = google.maps.SymbolPath.CIRCLE;

}