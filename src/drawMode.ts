import { KeyboardHandler } from "./key.js";
import { LatLng, Marker, MapWrapper, MapContainer } from "./map.js"

/**
 * Handles drawn items on the map.
 */
export class DrawMode {
    map: MapWrapper;

    active: boolean = true;
    lines: LatLng[][] = [[]];
    mapLines: MapContainer[] =  [];
    mapMarkers: Marker[][] =  [[]];
    currentLine: number = 0;
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

    /**
     * Register key handlers
     */
    registerKeys() {
        var me = this;
        this.keyListeners.push(KeyboardHandler.register('keydown', 'Escape', me.endLine.bind(me)));
        this.keyListeners.push(KeyboardHandler.register('keydown', 'c', me.closeLine.bind(me)));
        this.keyListeners.push(KeyboardHandler.register('keydown', 'z', me.undoLine.bind(me)));
        this.keyListeners.push(KeyboardHandler.register('keydown', 'n', me.nextLine.bind(me)));
        this.keyListeners.push(KeyboardHandler.register('keydown', 'p', me.prevLine.bind(me)));
    }

    /**
     * Handle map click
     * @param event
     */
    clickMap(event: any) {
        var pos = event.latLng;
        if (this.active) this.addLine(pos, false, false);
    }

    /**
     * Add a point to a line
     * @param pos
     * @param i
     * @param j
     */
    addLine(pos: LatLng, i: number | false = false, j: number | false = false) {
        if (i === false) i = this.currentLine;
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

    /**
     * End a line
     */
    endLine() {
        this.backgroundLine(this.currentLine);
        if (this.lines[this.lines.length - 1].length > 0) {
            this.lines.push([]);
        }
        this.currentLine = this.lines.length - 1;
    }

    /**
     * Close and end a line
     */
    closeLine() {
        var i = this.currentLine;
        var len = this.lines[i].length;
        if (len >= 2) {
            var a = this.lines[i][0], z = this.lines[i][len - 1];
            if (!a.equals(z)) {
                //Not already closed; so close.
                this.addLine(a, false, false);
            }
        }

        this.endLine();
    }

    /**
     * Remove the last point from a line
     * @returns
     */
    undoLine() {
        var i = this.currentLine;
        var j = this.lines[i].length - 1;
        if (j < 0) return;

        this.mapMarkers[i][j].setMap(null);
        this.lines[i].splice(j, 1);
        this.mapMarkers[i].splice(j, 1);
        this.redrawLine(i);
    }

    /**
     * Switch edit mode to the next line
     */
    nextLine() {
        this.backgroundLine(this.currentLine);
        this.currentLine = (this.currentLine + 1) % this.lines.length;
        this.foregroundLine(this.currentLine);
    }

    /**
     * Switch edit mode to the previous line
     */
    prevLine() {
        this.backgroundLine(this.currentLine);
        this.currentLine = (this.currentLine + this.lines.length - 1) % this.lines.length;
        this.foregroundLine(this.currentLine);
    }

    /**
     * Snap the point to the nearest point which is not on the same line OR is the other end of the current line
     * @param pos point to snap
     * @param oi current line
     * @param oj current point
     * @returns the point to use
     */
    snapPos(pos: LatLng, oi: number, oj: number): LatLng {
        var nP = this.map.pointToOffset(pos);
        if (!nP) return pos;
        var nearest = null;
        var distanceToNearest = null;

        for (var i = 0; i < this.lines.length; i++) {
            for (var j = 0; j < this.lines[i].length; j++) {
                var canSnap =
                    (i != oi) //Can snap if it's not on the same line.
                    || j == 0 && oj >= this.lines[i].length - 1 //Can snap if changing point is the last (or new last) and this is the first point
                    || j == this.lines[i].length - 1 && oj == 0; //Can snap if changing point is the first and this is the last point

                var oP = this.map.pointToOffset(this.lines[i][j]);
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

    /**
     * Redraw a particular line
     * @param i
     * @returns
     */
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
     * Recreate the markers on a line
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
     * Add a line marker
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

    /**
     * Bring a particular line to the foreground (edit mode)
     * @param i
     */
    foregroundLine(i: number) {
        this.redoMarkers(i);
        this.redrawLine(i);
    }

    /**
     * Put a particular line in the background (uneditable)
     * @param i
     * @returns
     */
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
