import { KeyboardHandler } from "./key.js";
import { LatLng, Marker, MapWrapper, MapContainer } from "./map.js"

export class DrawMode {
    map: MapWrapper;

    active: boolean = true;
    lines: LatLng[][] = [[]];
    mapLines: MapContainer[] =  [];
    mapMarkers: Marker[][] =  [[]];
    colours: string[] =  [
      '#000000',
      '#0000ff',
      '#00ff00',
      '#00ffff',
      '#ff0000',
      '#ff00ff',
      '#ffff00',
      '#ffffff',
    ];
    clickListener: string;
    keyListeners: string[] = [];

    constructor(map: MapWrapper) {
        this.map = map;
        this.registerKeys();
        var me = this;
        this.clickListener = this.map.listen('click', function(event) { me.clickMap(event); });
    }

    registerKeys() {
        var me = this;
        this.keyListeners.push(KeyboardHandler.register('keydown', 'Escape', me.endLine.bind(me)));
        this.keyListeners.push(KeyboardHandler.register('keydown', 'c', me.closeLine.bind(me)));
        this.keyListeners.push(KeyboardHandler.register('keydown', 'z', me.undoLine.bind(me)));
        this.keyListeners.push(KeyboardHandler.register('keydown', 'n', me.nextLine.bind(me)));
        this.keyListeners.push(KeyboardHandler.register('keydown', 'p', me.prevLine.bind(me)));
    }

    /**
     * 
     * @param event 
     */
    clickMap(event: any) {
        var pos = event.latLng;
        if (this.active) this.addLine(pos, false, false);
    }

    /**
     * 
     * @param pos 
     * @param i 
     * @param j 
     */
    addLine(pos: LatLng, i: number | false = false, j: number | false = false) {
        if (i === false) i = this.lines.length - 1;
        if (j === false) j = this.lines[i].length;
      
        if (j < this.lines[i].length) {
          this.lines[i].splice(j, 0, pos);
          this.redoMarkers(i);
        } else {
          pos = this.snapPos(pos, i, j);
          this.lines[i].push(pos);
          this.addLineMarker(i, j);
        }
      
        this.redrawLine(i);
    }

    endLine() {
        this.backgroundLine(this.lines.length - 1);
        this.lines.push([]);
    }

    closeLine() {
        var i = this.lines.length - 1;

        this.addLine(this.lines[i][0], false, false);
        this.endLine();
    }

    undoLine() {
        var i = this.lines.length - 1;
        var j = this.lines[i].length - 1;
        if (j < 0) return;
      
        this.mapMarkers[i][j].setMap(null);
        this.lines[i].splice(j, 1);
        this.mapMarkers[i].splice(j, 1);
        this.redrawLine(i);
    }

    nextLine() {}

    prevLine() {}

    snapPos(pos: LatLng, oi: number, oj: number): LatLng {
        var proj = this.map.getProjection();
        var nP = proj ? proj.fromLatLngToPoint(pos) : undefined;
        if (!proj || !nP) return pos;
        var nearest = null;
        var distanceToNearest = null;

        for (var i = 0; i < this.lines.length; i++) {
            for (var j = 0; j < this.lines[i].length; j++) {
                var canSnap =
                    (i != oi) //Can snap if it's not on the same line.
                    || j == 0 && oj >= this.lines[i].length - 1 //Can snap if changing point is the last (or new last) and this is the first point
                    || j == this.lines[i].length - 1 && oj == 0; //Can snap if changing point is the first and this is the last point

                var oP = proj.fromLatLngToPoint(this.lines[i][j]);
                if (!canSnap || !oP) continue;
      
                var scale = Math.pow(2, this.map.getZoom());
                var yDelta = Math.abs(oP.y - nP.y) * scale, xDelta = Math.abs(oP.x - nP.x) * scale;
                var dist = Math.sqrt(yDelta * yDelta + xDelta * xDelta);
                if (dist < 20 && (nearest === null || distanceToNearest === null || distanceToNearest > dist)) {
                    nearest = this.lines[i][j];
                    distanceToNearest = dist;
                }
            }
        }
      
        if (nearest === null) return pos;
        return nearest;
    }

    redrawLine(i: number) {
        if (this.mapLines[i]) this.map.remove(this.mapLines[i]);
        if (this.lines[i].length < 2) return;
        var me = this;
      
        this.mapLines[i] = new MapContainer();
        if (this.lines[i][0].lat() == this.lines[i][this.lines[i].length-1].lat() && this.lines[i][0].lng() == this.lines[i][this.lines[i].length-1].lng()) {
            var poly = new google.maps.Polygon({
                paths: this.lines[i],
                geodesic: true,
                strokeColor: this.colours[i % this.colours.length],
                strokeOpacity: 0.8,
                strokeWeight: 0,
                fillColor: this.colours[i % this.colours.length],
                fillOpacity: 0.35,
            });
            this.map.listenObject(poly, 'click', (function (map: MapWrapper, event: any) {
                map.trigger('click', event);
            }).bind(null, this.map));
            this.mapLines[i].items.push(poly);
        }
        for (var j = 1; j < this.lines[i].length; j++) {
            var l = new google.maps.Polyline({
                path: [this.lines[i][j-1], this.lines[i][j]],
                geodesic: true,
                strokeColor: this.colours[i % this.colours.length],
                strokeOpacity: 1.0,
                strokeWeight: 2,
            });
            this.map.listenObject(l, 'click', (function (i: number, j: number, event: any) {
                me.addLine(event.latLng, i, j);
            }).bind(l, i, j));
            this.mapLines[i].items.push(l);
        }
        this.map.add(this.mapLines[i]);
    }

    /**
     * 
     * @param i 
     */
    redoMarkers(i: number) {
        for (var ji = 0; ji < this.mapMarkers[i].length; ji++) {
            this.mapMarkers[i][ji].setMap(null);
        }
        this.mapMarkers[i] = [];
        for (var jj = 0; jj < this.lines[i].length; jj++) {
            this.addLineMarker(i, jj);
        }
    }

    /**
     * 
     * @param i 
     * @param j 
     */
    addLineMarker(i: number, j: number) {
        var marker = new google.maps.Marker({
            position: this.lines[i][j],
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 4,
              fillColor: '#fff',
              fillOpacity: 1.0,
              strokeColor: '#000',
              strokeWeight: 1,
            },
            draggable: true,
        });
        this.map.add(marker);
        
        if (!this.mapMarkers[i]) this.mapMarkers[i] = [];
        this.mapMarkers[i][j] = marker;
        
        var me = this;
        this.map.listenObject(marker, "click", (function(marker: any, i: number, j: number, evt: any) {
            me.lines[i].splice(j, 1);
            me.redoMarkers(i);
            me.redrawLine(i);
        }).bind(null, marker, i, j));
        
        this.map.listenObject(marker, 'dragend', (function(marker: any, i: number, j: number, evt: any) {
            var pos = me.snapPos(marker.getPosition(), i, j);
            marker.setPosition(pos);
            me.lines[i][j] = pos;
            me.redrawLine(i);
        }).bind(null, marker, i, j));
    }

    foregroundLine(i: number) {
        this.redoMarkers(i);
        this.redrawLine(i);
    }
      
    backgroundLine(i: number) {
        for (var j = 0; j < this.mapMarkers[i].length; j++) {
            this.mapMarkers[i][j].setMap(null);
        }
        this.mapMarkers[i] = [];
        this.map.remove(this.mapLines[i]);
        if (this.lines[i].length < 2) return;

        this.mapLines[i] = new MapContainer();
        if (this.lines[i][0].lat() == this.lines[i][this.lines[i].length-1].lat() && this.lines[i][0].lng() == this.lines[i][this.lines[i].length-1].lng()) {
            var poly = new google.maps.Polygon({
                paths: this.lines[i],
                geodesic: true,
                strokeColor: this.colours[i % this.colours.length],
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: this.colours[i % this.colours.length],
                fillOpacity: 0.35,
            });
            this.map.listenObject(poly, 'click', (function (map: MapWrapper, event: any) {
                map.trigger('click', event);
            }).bind(null, this.map));
            this.mapLines[i].items.push(poly);
            this.map.add(this.mapLines[i]);
            return;
        }
      
        this.mapLines[i].items.push(new google.maps.Polyline({
            path: this.lines[i],
            geodesic: true,
            strokeColor: this.colours[i % this.colours.length],
            strokeOpacity: 1.0,
            strokeWeight: 2,
        }));
        this.map.add(this.mapLines[i]);
    }
}
