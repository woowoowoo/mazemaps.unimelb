/* Mazemap Control Section */
var MAZEMAP_LIST_LIPI_URL = 'https://siteresolver.mazemap.com/siteresolver/';
/* geolocation control */
var geolocateController = new Mazemap.GUIComponents.LocationControl({ // new Mazemap.mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true
    },
    trackUserLocation: true
});
var geoLocationWatchID = null;

/* floor bar */
var floorBar = new Mazemap.ZLevelBarControl( {
    autoUpdate: true,
    maxHeight: 350
});

/* search tool */
var mySearch = new Mazemap.Search.SearchController({
    campusid: startCampus,
    campuscollectiontag: 'unimelb',
    rows: 10,
    withpois: true,
    withbuilding: true,
    withtype: false,
    withcampus: false,
    resultsFormat: 'geojson'
});

var resultMarker = new Mazemap.MazeMarker({
    color: 'rgb(253, 117, 38)',
    innerCircle: true,
    innerCircleColor: '#FFF',
    size: 34,
    innerCircleScale: 0.5,
    zLevel: 1
});

var popup = new Mazemap.Popup({});


/* Function Section*/

var onResize = function(){
    var height = myMap.getCanvas().clientHeight;
    var maxHeight = height - 100; // 100 pixels to clear search field
    floorBar.setMaxHeight(maxHeight);
};

var placePoiMarker = function(poi){
    // Get a center point for the POI, because the data can return a polygon instead of just a point sometimes
    var lngLat = Mazemap.Util.getPoiLngLat(poi);
    var zLevel = (typeof poi.properties.zValue !== 'undefined')?poi.properties.zValue:0;
    myMap.highlighter.clear();
    resultMarker.setLngLat(lngLat)
        .setZLevel(zLevel)
        .addTo(myMap);
    myMap.zLevel = zLevel;
    resultMarker.zLevelToggle();
    myMap.flyTo({center: lngLat, zoom: 19, duration: 2000});
};

var toTitleCase = function(str) {
    if (str != undefined && str != null) {
        return str.replace(/\w\S*/g, function(txt){
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
	} 
};

var clickPoiMarker =  function(poi){
    // Get a center point for the POI, because the data can return a polygon instead of just a point sometimes
    var lngLat = Mazemap.Util.getPoiLngLat(poi);
    var zLevel = poi.properties.zLevel;

    myMap.highlighter.clear();
    resultMarker.setLngLat(lngLat)
        .setZLevel(poi.properties.zLevel)
        .addTo(myMap);

    popup.setHTML(popupPoiHTML(poi));

    myMap.zLevel = zLevel;

    // If we have a polygon, use the default 'highlight' function to draw a marked outline around the POI.
    if(poi.geometry.type === "Polygon"){
        myMap.highlighter.highlight(poi);
    }

    if (!popup.isOpen())
        resultMarker.togglePopup();
    myMap.flyTo({center: lngLat, zoom: 19, duration: 2000});

    maptrack.event("Map","Click", poi.properties.identifier);
};

var blueDot = new Mazemap.BlueDot( {
	zLevel: 1,
	accuracyCircle: true
} ).setAccuracy(10);

var locationDotController = window.locationController = new Mazemap.LocationController({
	blueDot: blueDot,
	map: myMap
});



/* Map Event  */

myMap.on('load', function(){
    myMap.addControl(new Mazemap.mapboxgl.NavigationControl());

    myMap.addControl(geolocateController);
    myMap.addControl( floorBar, 'bottom-left' );
    myMap.highlighter = new Mazemap.Highlighter( myMap, {
        showOutline: true, // optional
        showFill: true, // optional,
        outlineColor: Mazemap.Util.Colors.MazeColors.MazeBlue, // optional
        fillColor: Mazemap.Util.Colors.MazeColors.MazeBlue // optional
    });
    resultMarker.setPopup(popup);
    mapOnLoadFunction();
    myMap.on('resize', onResize);
    onResize();
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('SQ_DESIGN_NAME')=='embed')
        return;
    myMap.addControl(new Mazemap.mapboxgl.FullscreenControl);
	
	
	geolocateController.on('click',function(){
		switch(locationDotController.state) {
			case 'deactivated':
				geolocateController.setState('working');
				locationDotController.setState('active');
				break;
			case 'active':
				navigator.geolocation.clearWatch(geoLocationWatchID);
				blueDot.remove(); 
				locationDotController.setState('deactivated');
				break;
		}				
	});
	
	locationDotController.on('statechange', function(){
		switch (locationDotController.state) {
			case 'active':
				UOMGeolocation();
				break;
			case 'deactivated':
				if (geolocateController.getState != 'error')
					geolocateController.setState('passive');
				break;
		}
		
	});
	
});

myMap.getCanvas().addEventListener('focus', function(){
    if (typeof mySearchInput !== 'undefined')
        mySearchInput.hideSuggestions();
});


var UOMWirelessGeolocation = function() {
	return new Promise(function(resolve, reject) {
		fetch(MAZEMAP_LIST_LIPI_URL).then(function(response) {
			if (!response.ok)
				throw "LIPI List Server - Communicate Error";
			return response.json();
		}).then(function(json) {
			if (json && json.error)
				throw "LIPI List Server Error: "+json.error;
			if (json){
				var LIPI_URL = json.positionUrl;
				fetch(LIPI_URL).then(function(response) {
					if (!response.ok)
						throw "LIPI Server - Communication Error ("+LIPI_URL+")";
					return response.json();
				}).then(function(json) {
					if (json && json.error)
						throw "LIPI Server Error: "+json.error;
					if (json){
						if (typeof json.geoLongitude === 'undefined' || typeof json.geoLatitude ==='undefined')
							throw "No Geolocation data";
						 var result = {
							latLng: {
								lat: Number(json.geoLatitude),
								lng: Number(json.geoLongitude)
							},
							accuracy: json.confidencefactor,
							z: isNaN(json.z)?0:Number(json.z),
							timestamp: Date.now()
						};
						return resolve(result);
					}
				}).catch(function(e) {
					reject(e);
				});							
			}	
		}).catch(function(e) {
			reject(e);
		});
	});
}


var UOMGeolocation = function(){
	if (navigator.geolocation)
		geoLocationWatchID = navigator.geolocation.watchPosition(
			function(data){
				UOMWirelessGeolocation()
				.then(function(UOMLocation){
					var UOMGeolocationEvent = new CustomEvent("UOMGeolocate", {
						"detail": UOMLocation
					});
					window.dispatchEvent(UOMGeolocationEvent);	
					updateBlueDotLocation(UOMLocation);
				})
				.catch(function(){
					var result = {
						latLng: {
							lat: Number(data.coords.latitude),
							lng: Number(data.coords.longitude)
						},
						accuracy: data.coords.accuracy,
						z: 0,
						timestamp: data.timestamp
					};
					var UOMGeolocationEvent = new CustomEvent("UOMGeolocate", {
						"detail": result
					});
					window.dispatchEvent(UOMGeolocationEvent);	
					updateBlueDotLocation(result);
				});
			},
			function(error){
				geolocateController.setState('error');
				locationDotController.setState('deactivated');
				blueDot.remove();
				navigator.geolocation.clearWatch(geoLocationWatchID);
				console.log(error);
			}
		);
}

var updateBlueDotLocation = function(currentLocation) {
	if (!currentLocation)
		return;
	var latLng = currentLocation.latLng; 
	var z=currentLocation.z;
	var	zoomLevel = Math.log2(591657550.5 / (currentLocation.accuracy * 45))-1;
	var accuracy = currentLocation.accuracy;
	geolocateController.setState('active');
	if (!blueDot._addedToMap) {
		blueDot.setLngLat(latLng).setZLevel(z).setAccuracy(accuracy).addTo(myMap);
		myMap.zLevel=z;
		myMap.flyTo({
			center: latLng,
			speed: 0.5,
			zoom: zoomLevel
		});
	}
	locationDotController.updateLocationData({
		lngLat: latLng,
		zLevel:z,
		accuracy:accuracy
	});
}

/* Windows onLoad */
window.onload = function() {
    if (document.getElementById("getDirectionLnk"))
		window.addEventListener("UOMGeolocate", function(evt) {
			console.info('Event call');
			var href = new URL(document.getElementById("getDirectionLnk").href);
			if (href) {
				href.searchParams.set('lngA', evt.detail.latLng.lng);
				href.searchParams.set('latA', evt.detail.latLng.lat);
				href.searchParams.set('zA', evt.detail.z);
				document.getElementById("getDirectionLnk").href= href.toString();
			}
		}, false);
};

window.onunload = function() {
	navigator.geolocation.clearWatch(geoLocationWatchID);
};

/* Analytics */

maptrack = {
	 view:function (pageurl){
		console.log("virtual load " + pageurl);
		utag.view({
		ga_virtual_page: pageurl
		}, null, [1]);
	},
	 event:function (categ,action,label){
		console.log(categ + " click " + label);
		utag.link({
		ga_EventCategory: categ,
		ga_EventAction: action,
		ga_EventLabel: label
		}, null, [1]);
	}
};