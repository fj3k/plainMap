import { Bounds, JSONBounds, LatLng, MapType, MapWrapper, Marker, Rectangle, Symbols } from "./map.js";
import * as Earl from "./common/earl.js";
import * as Mike from "./common/mike.js";
import { KeyboardHandler } from "./key.js";
import { JSONLocation, Location, UnknownLocation, PointType } from "./location.js";

type Data = {
    Info: {
        Name: string,
        Description: string
    },
    Maps: {
        [index: string]: {
            Bounds: Bounds,
            ReferencePoints?: string[]
        }
    },
    Common: {
        [index: string]: JSONLocation | Location
    },
    Pages: string[],
    Sections: {
        [index: string]: {
            Subsections: {
                [index: string]: (JSONLocation | Location | string)[]
            },
            Map?: string,
            MapType?: MapType
            Range?: [number, number]
        }
    },
    MapType?: MapType
}

/**
 * 
 */
export class MapContent {
    map: MapWrapper;
    data: Data = {
        Pages: [],
        Sections: {},
        Maps: {},
        Common: {},
        Info: {
            Name: "No data",
            Description: ""
        }
    };
    drawMode: boolean = false;
    currentPage: string | null = null;
    defaultMapType: MapType;
    disableRange: boolean = false;
    highlightedMap: any;
    clickListener: string;

    constructor(url: string, map: MapWrapper, mapType: MapType, drawMode: boolean = false) {
        this.map = map;
        this.drawMode = drawMode;
        this.defaultMapType = mapType;

        var me = this;
        this.clickListener = this.map.listen('click', function(event) { me.clickMap(event); });
        if (!url) return;
        url = url.replace(/^(data\/)?/, 'data/');
        url = url.replace(/(\.json)?$/, '.json');

        Earl.get(url, function (response: string) { me.parseResponse(response); }, function(err) {/*console.log(arguments)*/});
    }

    /**
     * Takes a JSON string and turns it into workable data.
     * @param json 
     */
    parseResponse(json: string) {
        json = json.replace(/\/\*.*?\*\//g, '');//Get rid of comments.

        this.data = JSON.parse(json, function (key, value) {
            if (value.hasOwnProperty('lat')) {
                return new LatLng(value.lat, value.lng);
            }
            if (value.hasOwnProperty('north')) {
                return new Bounds(new LatLng(value.south, value.west), new LatLng(value.north, value.east));
            }
            return value;
        });
        if (!this.data) {
            return;
        }

        if (!this.data.Sections) {
            console.error('No sections loaded.');
            this.data.Sections = {};
        }

        if (!this.data.Pages) this.data.Pages = Object.keys(this.data.Sections);
        if (!this.data.Maps) this.data.Maps = {};
        if (!this.data.Common) this.data.Common = {};
        if (!this.data.Info) this.data.Info = {
            Name: "Unnamed",
            Description: ""
        }

        var unknownLocations = new Set();
        this.disableRange = false;

        for (var id of Object.keys(this.data.Common)) {
            var deets: JSONLocation = this.data.Common[id] as JSONLocation;
            this.data.Common[id] = Location.getLocationObject(deets, this.map);
        }

        for (var x of Object.keys(this.data.Sections)) {
            if (/-|:/.test(x)) this.disableRange = true;
        
            for (var y of Object.keys(this.data.Sections[x].Subsections)) {
                if (/-|:/.test(y)) this.disableRange = true;
        
                for (var z in this.data.Sections[x].Subsections[y]) {
                    var deets: JSONLocation;
                    if (Mike.isStr(this.data.Sections[x].Subsections[y][z])) {
                        if (!this.data.Common[this.data.Sections[x].Subsections[y][z] as string]) {
                            unknownLocations.add(this.data.Sections[x].Subsections[y][z]);
                            this.data.Sections[x].Subsections[y][z] = new UnknownLocation({Label: this.data.Sections[x].Subsections[y][z] as string, Type: PointType.Point}, this.map);
                        // Removed the following code to keep Common items as strings so the anti-flicker code works.
                        // } else {
                        //     var cid: string = this.data.Sections[x].Subsections[y][z] as string;
                        //     this.data.Sections[x].Subsections[y][z] = this.data.Common[cid];
                        }
                    } else {
                        var deets: JSONLocation = this.data.Sections[x].Subsections[y][z] as JSONLocation;
                        this.data.Sections[x].Subsections[y][z] = Location.getLocationObject(deets, this.map);
                    }
                }

                var range = this.data.Sections[x].Range;
                if (!range) continue;

                for (var i = range[0]; i <= range[1]; i++) {
                    if (!this.data.Sections[x].Subsections[i]) this.data.Sections[x].Subsections[i] = [];
                }
            }
        }

        if (unknownLocations.size > 0) {
            var list = Array.from(unknownLocations).sort();
            console.log("Unknown locations:\n - " + list.join("\n - "));
        }

        this.handleContent();
    }

    /**
     * 
     * @returns 
     */
    handleContent() {
        //Wait until have both map and data.
        if (this.data.Pages.length === 0 || this.map.ready === false) return;

        var range = Mike.getParam('show');
        var mapOutlines = Mike.getParam('showmaps');
        if (this.drawMode) {
            var sections = Object.keys(this.data.Sections);
            this.showPoints(sections[0] + '-' + sections[sections.length-1]);
        } else if (mapOutlines) {
            this.showMaps(range);
            this.registerKeys();
        } else if (range) {
            this.showPoints(range);
        } else if (this.data.Pages) {
            this.showPoints(this.data.Pages[0]);
            if (this.data.Pages.length > 1) this.registerKeys();
        } else {
            throw new Error('Something is terribly wrong.');
        }
    }

    /**
     * 
     */
    registerKeys() {
        var me = this;
        KeyboardHandler.register('keydown', 'PageDown', me.next.bind(me));
        KeyboardHandler.register('keydown', 'PageUp', me.prev.bind(me));
        KeyboardHandler.register('keydown', 'Home', me.first.bind(me));
        KeyboardHandler.register('keydown', 'End', me.last.bind(me));
    }

    /**
     * 
     * @param event 
     */
    clickMap(event: any) {
        var pos = event.latLng;
        console.log(pos.lat(), pos.lng());
    }

    /**
     * 
     * @param str 
     * @returns 
     */
    parseRange(str: string): {[index: string]: string[]} {
        var selectedSections: {[index: string]: string[]} = {}

        if (this.disableRange || !/-|:/.test(str)) {
          //Acts 10
          if (this.data.Sections[str]) {
            selectedSections[str] = Object.keys(this.data.Sections[str].Subsections);
          }
          return selectedSections;
        }
      
        //Check for invalid ranges
        if (/-.*-|:[^-]*:|^[^:]*-.*:/.test(str)) return selectedSections;
      
        var parts = str.split(/-/);
        
        if (parts.length == 1) {
          //Acts 10:1
          var secs = parts[0].split(/:/);
          if (this.data.Sections[secs[0]] && this.data.Sections[secs[0]].Subsections[secs[1]]) {
            selectedSections[secs[0]] = [secs[1]];
          }
          return selectedSections;
        }
      
        if (!/:/.test(parts[0])) {
          //Acts 10-11
          if (/\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) parts[1] = parts[0].replace(/\d+$/, parts[1]);
          //Acts 10-Acts 11
          if (!this.data.Sections[parts[0]] || !this.data.Sections[parts[1]]) return selectedSections;
      
          var include = false;
          for (var x of (Object.keys(this.data.Sections))) {
            if (x == parts[0]) {
              //Have found start
              include = true;
            } else if (x == parts[1]) {
              //Have found end
              include = false;
            } else if (!include) {
              //Haven't found start; keep looking
              continue;
            }
            selectedSections[x] = Object.keys(this.data.Sections[x].Subsections);
      
            if (!include) break;//Found the end; quit loop.
          }
          return selectedSections;
        }
      
        var secsS = parts[0].split(/:/);
        var secsE;
        if (/:/.test(parts[1])) {
          secsE = parts[1].split(/:/);
        } else {
          //Acts 10:1-2
          secsE = [secsS[0], parts[1]];
        }
      
        //Acts 10:1-11:2
        if (/\d+$/.test(secsS[0]) && /^\d+$/.test(secsE[0])) secsE[0] = secsS[0].replace(/\d+$/, secsE[0]);
        //Acts 10:1-Acts 11:2
        if (!this.data.Sections[secsS[0]] || !this.data.Sections[secsE[0]]) return selectedSections;
      
        include = false;
        for (var x of (Object.keys(this.data.Sections))) {
          var checkStart = false, checkEnd = false;
          if (x == secsS[0] && x == secsE[0]) {
            //Have found start AND end
            include = false;
            checkStart = true;
            checkEnd = true;
          } else if (x == secsS[0]) {
            //Have found start
            include = true;
            checkStart = true;
          } else if (x == secsE[0]) {
            //Have found end
            include = false;
            checkEnd = true;
          } else if (!include) {
            //Haven't found start; keep looking
            continue;
          }
      
          var subsecs = Object.keys(this.data.Sections[x].Subsections);
          selectedSections[x] = [];
          if (!checkStart && !checkEnd || (checkStart && !checkEnd && subsecs[0] == secsS[1]) || (checkEnd && !checkStart && subsecs[subsecs.length-1] == secsE[1])) {
            selectedSections[x] = subsecs;
          } else if (checkStart) {
            var foundStart = false;
            for (var y of subsecs) {
              if (y == secsS[1]) foundStart = true;
              if (!foundStart) continue;
      
              selectedSections[x].push(y);
              if (checkEnd && y == secsE[1]) break;
            }
          } else if (checkEnd) {
            for (var y of subsecs) {
              selectedSections[x].push(y);
              if (y == secsE[1]) break;
            }
          }
      
          if (!include) break;//Found the end; quit loop.
        }
        return selectedSections;
    }

    /**
     * 
     * @param selected 
     */
    showPoints(selected: string) {
        var h = Mike.get("header");
        if (h) h.innerText = selected;
        this.currentPage = selected;
      
        var selectedSections =  this.parseRange(selected);
        var requestedMap = null;
        if (Object.keys(selectedSections).length == 1) {
          requestedMap = this.data.Sections[Object.keys(selectedSections)[0]].Map
        }
      
        for (var r of Object.keys(this.data.Common)) {
            var ref = this.data.Common[r] as Location;
            if (!ref.details.Reference) continue;

            ref.draw();
            ref.container.addClass('reference');
        }
      
        var dontBlank = [];
        for (var x of Object.keys(selectedSections)) {
            for (var y of selectedSections[x]) {
                for (var z of this.data.Sections[x].Subsections[y]) {
                    if (!Mike.isStr(z)) continue;
                    dontBlank.push(z);
                }
            }
        }
        var shownPoints: LatLng[] = [];
        for (var x of Object.keys(this.data.Sections)) {
            for (var y of Object.keys(this.data.Sections[x].Subsections)) {
                if (selectedSections[x] && selectedSections[x].indexOf(y) !== -1) continue;//Skip blanking these objects.
        
                for (var z of this.data.Sections[x].Subsections[y]) {
                    var point: Location;
                    if (Mike.isStr(z)) {
                        if (dontBlank.indexOf(z) !== -1) continue;
                        point = this.data.Common[z as string] as Location;
                    } else {
                        point = (z as any) as Location;
                    }
                    if (!point) continue;
        
                    if (!point.details.Reference) point.hide();
                    if (point.details.Reference) point.container.addClass('reference');
                }
            }
        }
      
        for (var x of Object.keys(selectedSections)) {
            for (var y of selectedSections[x]) {
                for (var z of this.data.Sections[x].Subsections[y]) {
                    var point: Location;
                    if (Mike.isStr(z)) {
                        point = this.data.Common[z as string] as Location;
                    } else {
                        point = (z as any) as Location;
                    }
                    if (!point) continue;
            
                    if (!point.details.OutsideBounds) {
                        var b = point.getBounds();
                        shownPoints = shownPoints.concat(b);
                    }
                    point.draw();
                    point.container.removeClass('reference');
                }

                if (this.data.Sections[x].MapType) {
                    this.map.setMapType(this.data.Sections[x].MapType);
                } else if (this.data.MapType) {
                    this.map.setMapType(this.data.MapType);
                } else {
                    this.map.setMapType(this.defaultMapType);
                }
            }
        }
      
        this.zoomMap(requestedMap, shownPoints);
    }

    /**
     * 
     * @param selected 
     */
    showMaps(selected: string | null) {
        var extent: {north: number | null, south: number | null, east: number | null, west: number | null} = {north: null, south: null, east: null, west: null};
        var drawn = [];
    
        //Draw map outlines
        var mapNames = Object.keys(this.data.Maps);
        var me = this;
        mapNames = mapNames.sort(function (a, b) {
            var sa = Math.abs(me.data.Maps[a].Bounds.getNorthEast().lat() - me.data.Maps[a].Bounds.getSouthWest().lat()) * Math.abs(me.data.Maps[a].Bounds.getNorthEast().lng() - me.data.Maps[a].Bounds.getSouthWest().lng());
            var sb = Math.abs(me.data.Maps[b].Bounds.getNorthEast().lat() - me.data.Maps[b].Bounds.getSouthWest().lat()) * Math.abs(me.data.Maps[b].Bounds.getNorthEast().lng() - me.data.Maps[b].Bounds.getSouthWest().lng());
            return sb - sa;
        });
        var i = 0;
        for (var m of mapNames) {
            var mapColour = 'rgba(' + (255 - i++ * (128 / mapNames.length)) + ',0,0,1)';
            this.outlineMap(this.data.Maps[m].Bounds, mapColour)
    
            var ne = this.data.Maps[m].Bounds.getNorthEast();
            var sw = this.data.Maps[m].Bounds.getSouthWest();
            if (extent.north === null || ne.lat() > extent.north) extent.north = ne.lat();
            if (extent.south === null || sw.lat() < extent.south) extent.south = sw.lat();
            if (extent.east === null || ne.lng() > extent.east) extent.east = ne.lng();
            if (extent.west === null || sw.lng() < extent.west) extent.west = sw.lng();
    
            var refPoints = this.data.Maps[m].ReferencePoints;
            if (refPoints) {
                for (var z of refPoints) {
                    var point: Location;
                    if (Mike.isStr(z)) {
                        drawn.push(z);
                        point = this.data.Common[z] as Location;
                    } else  {
                        point = (z as any) as Location;
                    }
                    if (!point) continue;

                    if (point.details.Bounds) {
                        this.outlineMap(point.details.Bounds, mapColour, 1)
                        var neB = point.details.Bounds.getNorthEast();
                        var swB = point.details.Bounds.getSouthWest();
                        if (extent.north === null || neB.lat() > extent.north) extent.north = neB.lat();
                        if (extent.south === null || swB.lat() < extent.south) extent.south = swB.lat();
                        if (extent.east === null || neB.lng() > extent.east) extent.east = neB.lng();
                        if (extent.west === null || swB.lng() < extent.west) extent.west = swB.lng();
                    } else if (point.details.Location) {
                        var marker = new Marker({
                            position: point.details.Location,
                            icon: {
                                path: Symbols.Circle,
                                scale: 2,
                                fillColor: mapColour,
                                fillOpacity: 1.0,
                                strokeColor: mapColour,
                                strokeWeight: 1,
                            },
                            draggable: false
                        });
                        this.map.add(marker);

                        if (point.details.Location.lat() > extent.north) extent.north = point.details.Location.lat();
                        if (point.details.Location.lat() < extent.south) extent.south = point.details.Location.lat();
                        if (point.details.Location.lng() > extent.east) extent.east = point.details.Location.lng();
                        if (point.details.Location.lng() < extent.west) extent.west = point.details.Location.lng();
                    }
                }
            }
        }
    
        var sections = Object.keys(this.data.Sections);
        i = 0;
        for (var x of sections) {
            var mapColour = 'rgba(0,0,' + (255 - i++ * (128 / sections.length)) + ',1)';
            for (var y of Object.keys(this.data.Sections[x].Subsections)) {
                for (var z2 of this.data.Sections[x].Subsections[y]) {
                    var point: Location;
                    if (Mike.isStr(z2)) {
                        drawn.push(z2);
                        point = this.data.Common[z2 as string] as Location;
                    } else  {
                        point = (z2 as any) as Location;
                    }
                    if (!point) continue;
    
                    if (point.details.Bounds) {
                        this.outlineMap(point.details.Bounds, mapColour, 1)
                        var neB = point.details.Bounds.getNorthEast();
                        var swB = point.details.Bounds.getSouthWest();
                        if (extent.north === null || neB.lat() > extent.north) extent.north = neB.lat();
                        if (extent.south === null || swB.lat() < extent.south) extent.south = swB.lat();
                        if (extent.east === null || neB.lng() > extent.east) extent.east = neB.lng();
                        if (extent.west === null || swB.lng() < extent.west) extent.west = swB.lng();
                    } else if (point.details.Location) {
                        var marker = new Marker({
                            position: point.details.Location,
                            icon: {
                                path: Symbols.Circle,
                                scale: 2,
                                fillColor: mapColour,
                                fillOpacity: 1.0,
                                strokeColor: mapColour,
                                strokeWeight: 1,
                            },
                            draggable: false
                        });
                        this.map.add(marker);
                        if (extent.north === null || point.details.Location.lat() > extent.north) extent.north = point.details.Location.lat();
                        if (extent.south === null || point.details.Location.lat() < extent.south) extent.south = point.details.Location.lat();
                        if (extent.east === null || point.details.Location.lng() > extent.east) extent.east = point.details.Location.lng();
                        if (extent.west === null || point.details.Location.lng() < extent.west) extent.west = point.details.Location.lng();
                    }
                }
            }
        }
    
        //Draw common this.data
        for (var r of Object.keys(this.data.Common)) {
            if (drawn.indexOf(r) >= 0) continue;
    
            var b = (this.data.Common[r] as Location).details.Bounds, l = (this.data.Common[r] as Location).details.Location;
            if (b) {
                this.outlineMap(b, 'rgba(0,128,0,0.5)', 1)
                var neB = b.getNorthEast();
                var swB = b.getSouthWest();
                if (extent.north === null || neB.lat() > extent.north) extent.north = neB.lat();
                if (extent.south === null || swB.lat() < extent.south) extent.south = swB.lat();
                if (extent.east === null || neB.lng() > extent.east) extent.east = neB.lng();
                if (extent.west === null || swB.lng() < extent.west) extent.west = swB.lng();
            } else if (l) {
                var marker = new Marker({
                    position: l,
                    icon: {
                        path: Symbols.Circle,
                        scale: 2,
                        fillColor: 'rgba(0,128,0,0.5)',
                        fillOpacity: 1.0,
                        strokeColor: 'rgba(0,128,0,0.5)',
                        strokeWeight: 1,
                    },
                    draggable: false
                });
                this.map.add(marker);
                if (extent.north === null || l.lat() > extent.north) extent.north = l.lat();
                if (extent.south === null || l.lat() < extent.south) extent.south = l.lat();
                if (extent.east === null || l.lng() > extent.east) extent.east = l.lng();
                if (extent.west === null || l.lng() < extent.west) extent.west = l.lng();
            }
        }
    
        this.map.fitBounds(extent as JSONBounds);
    }

    /**
     * 
     * @param requestedMap 
     * @param shownPoints 
     */
    zoomMap(requestedMap: string | null | undefined, shownPoints: LatLng[]) {
        var useBounds = null;
        var colour = '#0F0';

        if (requestedMap && this.data.Maps[requestedMap]) {
            useBounds = this.data.Maps[requestedMap].Bounds;
        } else {
            var useMap = this.findMap(shownPoints);
            if (useMap === null) {
                useBounds = this.map.boundsFromLatLngList(shownPoints);
                colour = '#F80'
            } else {
                useBounds = this.data.Maps[useMap].Bounds;
            }
        }

        if (useBounds) {
            this.map.fitBounds(useBounds);
      
            if (Mike.getParam('showmaps')) {
                if (this.highlightedMap) this.map.remove(this.highlightedMap);
                this.highlightedMap = this.outlineMap(useBounds, colour, 2, 2);
            }
        }
    }

    /**
     * 
     * @param positions 
     * @returns 
     */
    findMap(positions: LatLng[]) {
        if (!this.data.Maps || Object.keys(this.data.Maps).length == 0) return null;
        var mapSizes: {[index: string]: number} = {};
        for (var m of Object.keys(this.data.Maps)) {
            var ne = this.data.Maps[m].Bounds.getNorthEast();
            var sw = this.data.Maps[m].Bounds.getSouthWest();

            var allFit = true;
            //Check points fit inside map;
            for (var p of positions) {
                if (p.lat() <= ne.lat() && p.lat() >= sw.lat() && p.lng() <= ne.lng() && p.lng() >= sw.lng()) continue;

                allFit = false;
                break;
            }
            if (!allFit) continue;

            var s = Math.abs(ne.lat() - sw.lat()) * Math.abs(ne.lng() - sw.lng());
            mapSizes[m] = s;
        }
        var options = Object.keys(mapSizes);
        if (options.length == 0) return null;

        options = options.sort(function (a, b) { return mapSizes[a] - mapSizes[b]; });
        if (positions.length == 0) return options[options.length-1];
        return options[0];
    }

    //TODO Move to location.ts
    /**
     * 
     * @param m 
     * @param mapColour 
     * @param strokeWeight 
     * @param zIndex 
     * @returns 
     */
    outlineMap(m: Bounds, mapColour: string, strokeWeight?: number, zIndex?: number) {
        strokeWeight = strokeWeight ? strokeWeight : 2;
        zIndex = zIndex ? zIndex : 1;
        const rectangle = new Rectangle({
            strokeColor: mapColour,
            strokeOpacity: 0.8,
            strokeWeight: strokeWeight,
            fillOpacity: 0,
            bounds: m,
        });
        this.map.add(rectangle);
        return rectangle;
    }

    /**
     * 
     * @returns 
     */
    next() {
        if (!this.currentPage) return this.showPoints(this.data.Pages[0]);
        var i = this.data.Pages.indexOf(this.currentPage);
        if (i < this.data.Pages.length - 1) i++;
        this.showPoints(this.data.Pages[i]);
    }

    /**
     * 
     * @returns 
     */
    prev() {
        if (!this.currentPage) return this.showPoints(this.data.Pages[this.data.Pages.length-1]);
        var i = this.data.Pages.indexOf(this.currentPage);
        if (i > 0) i--;
        this.showPoints(this.data.Pages[i]);
    }

    /**
     * 
     */
    first() {
        this.showPoints(this.data.Pages[0]);
    }

    /**
     * 
     */
    last() {
        this.showPoints(this.data.Pages[this.data.Pages.length-1]);
    }
}
