import { LatLng, MapWrapper, MapContainer } from "./map.js";
import * as Mike from "./common/mike.js";
import { Location, PointType } from "./location.js";

/**
 * Handles plotting the user's location on the map.
 */
export class UserLocation {
    location: GeolocationCoordinates | false = false;
    map: MapWrapper;
    marker?: MapContainer;
    wpid?: number;
    boundsListener?: string;

    constructor(map: MapWrapper) {
        this.map = map;

        if (!("geolocation" in navigator) || !Mike.getParam('you')) return;

        var me = this;
        navigator.geolocation.getCurrentPosition(me.geoSuccess.bind(me));

        var options = {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 27000
        };

        this.wpid = navigator.geolocation.watchPosition(me.geoSuccess.bind(me), me.geoFailure.bind(me), options);
        this.boundsListener = this.map.listen('bounds_changed', function(event) { me.updateLocation(); });
    }

    /**
     * Handle a successful location lookup.
     * @param position
     */
    geoSuccess(position: GeolocationPosition) {
        if (position) this.location = position.coords;

        this.updateLocation();
    }

    /**
     * Handle a failed location lookup.
     * @param error
     * @returns
     */
    geoFailure(error: GeolocationPositionError) {
        var footer = Mike.get('footer');
        if (!footer) return;
        footer.innerHTML = '(' + error.code + ') ' + error.message;
    }

    /**
     * Update the user's location
     * @returns
     */
    updateLocation() {
        if (!this.map.ready) return;

        if (this.marker) this.map.remove(this.marker);
        if (this.location === false) return;

        var pos = new LatLng(this.location.latitude, this.location.longitude);
        this.marker = Location.addPoint(this.map, pos, PointType.Point, '#080', 'You');

        var div = Mike.get('you');
        var divArr = Mike.get('youArr');
        var divDist = Mike.get('youDist');
        if (!div || !divArr || !divDist) return;

        var bounds = this.map.getBounds();
        if (!bounds || bounds.contains(pos)) {
            div.style.display = 'none';
            return;
        }

        div.style.display = 'block';

        var refPoint: LatLng | undefined;
        var ne = bounds.getNorthEast(), sw = bounds.getSouthWest();
        var north = ne.lat(), south = sw.lat(), east = ne.lng(), west = sw.lng();
        var ns = [{v: north, p: 'top'}, {v: south, p: 'bottom'}];
        var ew = [{v: east, p: 'right'}, {v: west, p: 'left'}];
        var minDist = null;
        var minProps: {h: string, v: string} = {h: '', v: ''};
        for (var i of ns) {
            for (var j of ew) {
                var point = new LatLng(i.v, j.v);
                var d = this.map.computeDistanceBetween(point, pos);
                if (minDist === null || d < minDist) {
                    minDist = d;
                    minProps.h = i.p;
                    minProps.v = j.p;
                    refPoint = point;
                }
            }
        }
        this.clearPosProps(div);
        (div.style as any)[minProps.h] = 0;
        (div.style as any)[minProps.v] = 0;

        var rect = div.getBoundingClientRect();
        refPoint = this.map.pointAtOffset(rect.left + rect.width / 2, rect.top + rect.height / 2);

        if (!refPoint) return;

        var bearing = this.map.computeHeading(refPoint, pos);
        var dist = this.map.computeDistanceBetween(refPoint, pos);
        divArr.style.transform = 'rotate(' + bearing + 'deg)';
        divDist.innerText = new Intl.NumberFormat('en-AU', {maximumSignificantDigits: 3}).format(dist / 1000) + 'km';
    }

    /**
     * Clear positional properties from an element.
     * @param el
     */
    private clearPosProps(el: HTMLElement) {
        el.style.removeProperty('top');
        el.style.removeProperty('left');
        el.style.removeProperty('right');
        el.style.removeProperty('bottom');
    }
}
