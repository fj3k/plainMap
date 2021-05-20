import { Bounds, LatLng, MapContainer, MapWrapper, MapLabel, Marker, Polyline } from "./map.js";

export enum PointType {
    Point = 'Point',
    Mountain = 'Mountain',
    Region = 'Region',
    Sea = 'Sea',
    Line = 'Line',
    Area = 'Area'
}

export type JSONLocation = {
    Label: string,
    Type: PointType
    Location?: LatLng,
    Bounds?: Bounds,
    Poly?: LatLng[],
    Reference?: boolean,
    OutsideBounds?: boolean,
    MapElements?: any,
    Class?: string
}

/**
 * Generic class to handle the drawing of a specific location
 */
export abstract class Location {
    details: JSONLocation;
    map: MapWrapper;
    container: MapContainer;

    constructor(details: JSONLocation, map: MapWrapper) {
        this.details = details;
        this.map = map;
        this.container = new MapContainer();
    }

    /**
     * Factory to create a specific class for a given location.
     * @param details
     * @param map
     * @returns
     */
    static getLocationObject(details: JSONLocation, map: MapWrapper): Location {
        switch (details.Type) {
            case PointType.Point: return new PointLocation(details, map);
            case PointType.Mountain: return new MountainLocation(details, map);
            case PointType.Region: return new RegionLocation(details, map);
            case PointType.Sea: return new SeaLocation(details, map);
            case PointType.Line: return new LineLocation(details, map);
        }
        return new PointLocation(details, map);
    }

    /**
     * Draws the location
     */
    abstract draw(): void;

    /**
     * Gets the bounds (sw, ne points) of the location
     */
    abstract getBounds(): LatLng[];

    /**
     * Show the location
     */
    show() {
        this.map.add(this.container);
    }

    /**
     * Hides the location
     */
    hide() {
        this.map.remove(this.container);
    }

    /**
     * Generic code to add a point to the map (given there is a lot of overlap between types)
     * @param map
     * @param coords
     * @param type
     * @param colour
     * @param text
     * @param clas
     * @returns
     */
    static addPoint(map: MapWrapper, coords: LatLng, type?: PointType, colour?: string, text?: string, clas?: string) {
        if (!type) type = PointType.Point;
        if (!colour) colour = '#fff';
        if (!text) text = ' ';
        if (type === PointType.Sea) type = PointType.Region;

        var container = new MapContainer();
        var label = new MapLabel({
            position: coords,
            label: text,
            'class': type == PointType.Region ? 'mapLabel' : (type == PointType.Mountain ? 'arrowLabel' : 'markerLabel'),
            style: {
                zIndex: 12
            }
        });
        map.add(label);
        if (clas) label.addClass(clas);
        container.items.push(label);

        if (type != PointType.Region) {
            var marker = new Marker({
                position: coords,
                icon: {
                    path: type == PointType.Mountain ? google.maps.SymbolPath.FORWARD_OPEN_ARROW : google.maps.SymbolPath.CIRCLE,
                    scale: type == PointType.Mountain ? 2 : 4,
                    fillColor: colour,
                    fillOpacity: 1.0,
                    strokeColor: '#fff',
                    strokeWeight: 1,
                },
                draggable: false,
            });
            map.add(marker);
            container.items.push(marker);
        }

        return container;
    }
}

/**
 * Handles an unknown location
 */
export class UnknownLocation extends Location {
    /**
     * Draws the location
     */
    draw() {}

    /**
     * Gets the bounds (sw, ne points) of an unknown location
     * (No bounds; as there's no location)
     */
    getBounds() {
        return [];
    }
}

/**
 * Handles a point location
 */
class PointLocation extends Location {
    /**
     * Draws the point
     */
    draw() {
        if (this.container.items.length > 0) {
            this.map.add(this.container);
            return;
        }

        if (!this.details.Location) return;
        this.container = Location.addPoint(this.map, this.details.Location, this.details.Type, '#00f', this.details.Label, this.details.Class);
    }

    /**
     * Gets the bounds (sw, ne points) of the point
     * Only returns one point; as the sw and ne points are identical
     */
    getBounds() {
        var b = [];
        if (this.details.Location) b.push(this.details.Location);
        return b;
    }
}

/**
 * Handles a region location
 */
class RegionLocation extends Location {
    /**
     * Draws the region
     */
    draw() {
        if (this.container.items.length > 0) {
            this.map.add(this.container);
            return;
        }

        var point: LatLng | undefined;
        if (this.details.Bounds) {
            point = this.details.Bounds.getCenter();
        } else {
            point = this.details.Location;
        }
        if (!point) return;

        this.container = Location.addPoint(this.map, point, this.details.Type, '#00f', this.details.Label, this.details.Class);
    }

    /**
     * Gets the bounds (sw, ne points) of the location
     */
    getBounds() {
        var b = [];
        if (this.details.Location) {
            b.push(this.details.Location);
        } else if (this.details.Bounds) {
            b.push(this.details.Bounds.getNorthEast(), this.details.Bounds.getSouthWest());
        }
        return b;
    }
}

/**
 * Handles a line
 */
class LineLocation extends Location {
    /**
     * Draws the line
     */
    draw() {
        if (this.container.items.length > 0) {
            this.map.add(this.container);
            return;
        }

        this.container = new MapContainer();
        var line = new Polyline({
            path: this.details.Poly,
            geodesic: true,
            strokeColor: '#fff',
            strokeOpacity: 1.0,
            strokeWeight: 4,
        });
        this.container.items.push(line);
        var line = new Polyline({
            path: this.details.Poly,
            geodesic: true,
            strokeColor: '#00f',
            strokeOpacity: 1.0,
            strokeWeight: 2,
        });
        this.container.items.push(line);
        this.map.add(this.container);
    }

    /**
     * Gets the bounds (sw, ne points) of the location
     */
    getBounds() {
        var b = [];
        if (this.details.Poly) {
            var bounds = this.map.boundsFromLatLngList(this.details.Poly);
            if (bounds) b.push(bounds.getNorthEast(), bounds.getSouthWest());
        }
        return b;
    }
}

/**
 * Handles a Mountain point
 */
class MountainLocation extends PointLocation {}

/**
 * Handles a sea region
 */
class SeaLocation extends RegionLocation {}
