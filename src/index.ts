import { Bounds, LatLng, MapType, MapWrapper } from "./map.js";
import * as Mike from "./common/mike.js";
import { UserLocation } from "./userLoc.js";
import { MapContent } from "./content.js";

var map: MapWrapper;
var you: UserLocation;
var mapContent: MapContent;

const mapStyle = [{"elementType": "geometry","stylers": [{"color": "#f5f5f5"}]},{"elementType": "labels","stylers": [{"visibility": "off"}]},{"elementType": "labels.icon","stylers": [{"visibility": "off"}]},{"elementType": "labels.text.fill","stylers": [{"color": "#616161"}]},{"elementType": "labels.text.stroke","stylers": [{"color": "#f5f5f5"}]},{"featureType": "administrative","elementType": "geometry","stylers": [{"visibility": "off"}]},{"featureType": "administrative.land_parcel","stylers": [{"visibility": "off"}]},{"featureType": "administrative.land_parcel","elementType": "labels.text.fill","stylers": [{"color": "#bdbdbd"}]},{"featureType": "administrative.neighborhood","stylers": [{"visibility": "off"}]},{"featureType": "poi","stylers": [{"visibility": "off"}]},{"featureType": "poi","elementType": "geometry","stylers": [{"color": "#eeeeee"}]},{"featureType": "poi","elementType": "labels.text.fill","stylers": [{"color": "#757575"}]},{"featureType": "poi.park","elementType": "geometry","stylers": [{"color": "#e5e5e5"}]},{"featureType": "poi.park","elementType": "labels.text.fill","stylers": [{"color": "#9e9e9e"}]},{"featureType": "road","stylers": [{"visibility": "off"}]},{"featureType": "road","elementType": "geometry","stylers": [{"color": "#ffffff"}]},{"featureType": "road","elementType": "labels.icon","stylers": [{"visibility": "off"}]},{"featureType": "road.arterial","elementType": "labels.text.fill","stylers": [{"color": "#757575"}]},{"featureType": "road.highway","elementType": "geometry","stylers": [{"color": "#dadada"}]},{"featureType": "road.highway","elementType": "labels.text.fill","stylers": [{"color": "#616161"}]},{"featureType": "road.local","elementType": "labels.text.fill","stylers": [{"color": "#9e9e9e"}]},{"featureType": "transit","stylers": [{"visibility": "off"}]},{"featureType": "transit.line","elementType": "geometry","stylers": [{"color": "#e5e5e5"}]},{"featureType": "transit.station","elementType": "geometry","stylers": [{"color": "#eeeeee"}]},{"featureType": "water","elementType": "geometry","stylers": [{"color": "#c9c9c9"}]},{"featureType": "water","elementType": "labels.text.fill","stylers": [{"color": "#9e9e9e"}]}];
var defaultMapType: MapType = MapType.Terrain;

/**
 * Entry point for the application.
 * @returns
 */
function init() {
    var mT = Mike.getParam('type');
    if (mT && (Object as any).values(MapType).includes(mT)) defaultMapType = mT as MapType;

    var minLat = -70, minLng = -180, maxLat = 70, maxLng = 180;
    var bounds = new Bounds(new LatLng(minLat, minLng), new LatLng(maxLat, maxLng));
    var el = Mike.get('map');
    if (el === null) return;

    map = MapWrapper.getMap(el, {
        center: {lat: 0.0, lng: 0.0},
        zoom: 2,
        styles: mapStyle,
        disableDefaultUI: true,
        scaleControl: true,
        mapTypeId: defaultMapType
    }, function() { onMapReady() });
    map.fitBounds(bounds);

    you = new UserLocation(map);

    var src = Mike.getParam('url');
    if (src) mapContent = new MapContent(src, map, defaultMapType, Mike.getParam('draw') !== null)

    //google.maps.event.addDomListener(Mike.get('map'), 'keydown', function(event) { checkKey(event); });
}

/**
 * Executed when the map is ready and loaded.
 */
function onMapReady() {
    if (you) you.updateLocation();
    if (mapContent) mapContent.handleContent();
}

init();
