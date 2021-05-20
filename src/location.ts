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

export abstract class Location {
    details: JSONLocation;
    map: MapWrapper;
    container: MapContainer;

    constructor(details: JSONLocation, map: MapWrapper) {
        this.details = details;
        this.map = map;
        this.container = new MapContainer();
    }

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

    abstract draw(): void;

    abstract getBounds(): LatLng[];

    show() {
        this.map.add(this.container);
    }

    hide() {
        this.map.remove(this.container);
    }

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

export class UnknownLocation extends Location {
    draw() {}
    getBounds() {
        return [];
    }
}

class PointLocation extends Location {
    draw() {
        if (this.container.items.length > 0) {
            this.map.add(this.container);
            return;
        }

        if (!this.details.Location) return;
        this.container = Location.addPoint(this.map, this.details.Location, this.details.Type, '#00f', this.details.Label, this.details.Class);
    }

    getBounds() {
        var b = [];
        if (this.details.Location) b.push(this.details.Location);
        return b;
    }
}

class RegionLocation extends Location {
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

class LineLocation extends Location {
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

    getBounds() {
        return [];
    }
}

class MountainLocation extends PointLocation {}
class SeaLocation extends RegionLocation {}
