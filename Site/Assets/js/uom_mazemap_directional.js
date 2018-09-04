var routeController;
var routeOptionDisplay = false;

var routingParameter = function (startPosition, destinationPosition){
    this.startPosition = startPosition;
    this.destinationPosition= destinationPosition;
    this.latestClickPos = null;
    this.startMarker = new Mazemap.MazeMarker({
        color: 'green',
        innerCircle: true,
        innerCircleColor: '#FFF',
        size: 34,
        innerCircleScale: 0.5,
        zLevel: 1
    });
    this.destinationMarker = new Mazemap.MazeMarker({
        color: 'red',
        innerCircle: true,
        innerCircleColor: '#FFF',
        size: 34,
        innerCircleScale: 0.5,
        zLevel: 1
    });
    Object.defineProperties(this,{
        start: {
            get: function () {
                return this.startPosition;
            },
            set: function (val) {
                this.startPosition = val;
                if (document.getElementById("fromInfo"))
                    document.getElementById("fromInfo").classList.remove("location-query");
                this.setStartMarker();
                this.historyPushState();
            }
        },
        destination: {
            get: function () {
                return this.destinationPosition;
            },
            set: function (val) {
                this.destinationPosition = val;
                if (document.getElementById("toInfo"))
                    document.getElementById("toInfo").classList.remove("location-query");
                this.setDestinationMarker();
                this.historyPushState();
            }
        },
        canRoute: {
            get: function () {
                return this.startPosition&&this.destinationPosition;
            }
        }
    });
};

routingParameter.prototype = {
    startPosition: null,
    destinationPosition: null
};

routingParameter.prototype.setLastClickAsStartPosition = function() {
    this.start = this.latestClickPos;
};

routingParameter.prototype.setLastClickAsDestinationPosition = function() {
    this.destination = this.latestClickPos;
};

routingParameter.prototype.setStartMarker = function() {
    if (this.startPosition) {
        if (this.startPosition.hasOwnProperty('poiId')) {
			var marker = this.startMarker;
            Mazemap.Data.getPoi(this.startPosition.poiId).then( function(poi) {
                var lngLat = Mazemap.Util.getPoiLngLat(poi);
                var zLevel = poi.properties.zLevel;

                resultMarker.remove();
                marker.setLngLat(lngLat)
                    .setZLevel(zLevel)
                    .addTo(myMap);
                myMap.zLevel = zLevel;
            });
        } else {
            this.startMarker.setLngLat(this.startPosition.lngLat)
                .setZLevel(this.startPosition.zLevel)
                .addTo(myMap);
        }

        if (!routeOptionDisplay) {
            if (document.getElementById("routeOptions"))
                document.getElementById("routeOptions").style.display = "inline";
            routeOptionDisplay = true;
        }

    }
};


routingParameter.prototype.setDestinationMarker = function() {
    if (this.destinationPosition) {
        if (this.destinationPosition.hasOwnProperty('poiId')) {
			var marker = this.destinationMarker;
            Mazemap.Data.getPoi(this.destinationPosition.poiId).then(function(poi) {
                var lngLat = Mazemap.Util.getPoiLngLat(poi);
                var zLevel = poi.properties.zLevel;

                resultMarker.remove();
                marker.setLngLat(lngLat)
                    .setZLevel(zLevel)
                    .addTo(myMap);
                myMap.zLevel = zLevel;
            });
        } else {
            this.destinationMarker.setLngLat(this.destinationPosition.lngLat)
                .setZLevel(this.destinationPosition.zLevel)
                .addTo(myMap);
        }
        if (!routeOptionDisplay) {
            if (document.getElementById("routeOptions"))
                document.getElementById("routeOptions").style.display = "inline";
            routeOptionDisplay = true;
        }
    }
};

routingParameter.prototype.centerMap = function() {

    if (this.startPosition ? !this.destinationPosition: this.destinationPosition) {
        if (this.startPosition)
            if (this.startPosition.hasOwnProperty('poiId'))
                Mazemap.Data.getPoi(this.startPosition.poiId).then( function(poi) {
                    myMap.zLevel = poi.properties.zLevel;
                    if(poi.geometry.type === "Polygon"){
                        myMap.highlighter.highlight(poi);
                    }

                    myMap.flyTo({center: Mazemap.Util.getPoiLngLat(poi), zoom: 19, duration: 2000});
                }).catch(function(e){console.log(e)});
            else
                myMap.flyTo({center: this.startPosition.lngLat, zoom: 19, duration: 2000});
        if (this.destinationPosition)
            if (this.destinationPosition.hasOwnProperty('poiId'))
                Mazemap.Data.getPoi(this.destinationPosition.poiId).then( function(poi) {
                    myMap.zLevel = poi.properties.zLevel;
                    if(poi.geometry.type === "Polygon"){
                        myMap.highlighter.highlight(poi);
                    }

                    myMap.flyTo({center: Mazemap.Util.getPoiLngLat(poi), zoom: 19, duration: 2000});
                });
            else
                myMap.flyTo({center: this.destinationPosition.lngLat, zoom: 19, duration: 2000});
    }
};

routingParameter.prototype.reserveDirection = function() {
    temp = this.startPosition;
    this.startPosition = this.destinationPosition;
    this.destinationPosition = temp;
    this.setStartMarker();
    this.setDestinationMarker();
    this.historyPushState();
}

routingParameter.prototype.historyPushState = function() {
    url = document.URL.match(/^[^\#\?]+/)[0];
    var parameters = {};
    if (this.startPosition !== null) {
        if (this.startPosition.hasOwnProperty('poiId'))
            parameters.pointA=this.startPosition.poiId;
        if (this.startPosition.hasOwnProperty('lngLat')) {
            parameters.lngA=this.startPosition.lngLat.lng;
            parameters.latA=this.startPosition.lngLat.lat;
            parameters.zA=this.startPosition.zLevel;
        }

    }
    if (this.destinationPosition !== null) {
        if (this.destinationPosition.hasOwnProperty('poiId'))
            parameters.pointB=this.destinationPosition.poiId;
        if (this.destinationPosition.hasOwnProperty('lngLat')) {
            parameters.lngB=this.destinationPosition.lngLat.lng;
            parameters.latB=this.destinationPosition.lngLat.lat;
            parameters.zB=this.destinationPosition.zLevel;
        }
    }
    history.pushState(null, null, url+'?'+Object.keys(parameters).map(function (k) {
		console.log(k);
        return k + '=' + encodeURIComponent(parameters[k]);
    }).join('&'));
    maptrack.view(document.location.href);
};


var routePath = function(routingParameter, avoidStairs) {
    if (avoidStairs === undefined)
        avoidStairs=false;
    var routeInfoDom=document.getElementById("routeInfo");
    if (avoidStairs) {
        if (routeInfoDom)
            routeInfoDom.classList.add("avoid-obstacles");
    } else {
        if (routeInfoDom)
            routeInfoDom.classList.remove("avoid-obstacles");
    }

    if (routingParameter.canRoute) {
        if (routeInfoDom) {
            routeInfoDom.classList.remove("route-success");
            routeInfoDom.classList.add("route-query");
        }
        setRoute(routingParameter.start, routingParameter.destination, avoidStairs);
    }
};

myMap.on('load', function(){
    routeController = new Mazemap.RouteController(myMap, {
        routeLineColorPrimary: '#0099EA',
        routeLineColorSecondary: '#888888'
    });
    routePath(routingInformation);
    routingInformation.setStartMarker();
    routingInformation.setDestinationMarker();
    routingInformation.centerMap();

});

myMap.on('click', function(e) {
    var lngLat = e.lngLat;
    var zLevel = myMap.zLevel;
    routingInformation.latestClickPos = {lngLat: e.lngLat, zLevel: myMap.zLevel};
    myMap.highlighter.clear();
    resultMarker
        .setLngLat(lngLat)
        .setZLevel(zLevel)
        .addTo(myMap);

    popup.setHTML(popupLatLngHTML());

    Mazemap.Data.getPoiAt(lngLat, zLevel).then( function(poi) {
        // Now you can do what you want with the returned POI
        console.log('Found poi', poi);
        routingInformation.latestClickPos = {poiId: poi.properties.poiId};
        // Place a marker on the map, or highlight the room
        clickPoiMarker(poi);
    }).catch( function(error){
        if (!popup.isOpen())
            resultMarker.togglePopup();
    });

});



var popupPoiHTML = function(poi) {
    return '<h4>'+ (poi.properties.title!=='null'?poi.properties.title:'')+'</h4><p>'+(poi.properties.buildingName?toTitleCase(poi.properties.buildingName):'')+(poi.properties.floorName?', Floor '
        +toTitleCase(poi.properties.floorName):'')+'</p><p><strong>Get directions:<strong></p><p><a href="#" class="set-start">Start Here</a> or <a href="#" class="set-end">End here</a></p>';
};

var popupLatLngHTML = function() {
    return '<p><strong>Get directions:<strong></p><p><a href="#" class="set-start">Start Here</a> or <a href="#" class="set-end">End here</a></p>';
};


var setRoute = function(start, dest, avoidStairs){
    if (avoidStairs === undefined)
        avoidStairs=false;
    routeController.clear(); // Clear existing route, if any
    Mazemap.Data.getRouteJSON(start, dest, {'avoidStairs':avoidStairs})
        .then(function(geojson){
            console.log('@ geojson', geojson);
            routeController.setPath(geojson);
            var bounds = Mazemap.Util.Turf.bbox(geojson);
            myMap.fitBounds( bounds, {padding: 100} );
            if (document.getElementById('routeExtraParameters'))
                document.getElementById('routeExtraParameters').style.display="inline";
            var routeInfoDom=document.getElementById("routeInfo");
            if (routeInfoDom) {
                routeInfoDom.classList.replace("route-query","route-success");
            }
        })
        .catch(function(error) {
            console.log("set Route:",error);
        });
};

var reseverDirectionDisplay = function() {

    temp = document.getElementById("fromLocation").innerHTML;
    document.getElementById("fromLocation").innerHTML = document.getElementById("toLocation").innerHTML;
    document.getElementById("toLocation").innerHTML = temp;

    var change = false;
    toBtn = document.getElementById("toLocationBtn");
    fromBtn = document.getElementById("fromLocationBtn");
    if (toBtn){
        toBtn.id="fromLocationBtn";
        change = true;
    }
    if (fromBtn){
        fromBtn.id="toLocationBtn";
        change = true;
    }
    if (change)
        setGeolocationButton();

};

var setGeolocationButton = function () {
    if (document.getElementById("fromLocationBtn"))
        document.getElementById("fromLocationBtn").onclick=function(e){
            e.preventDefault();
            if (navigator.geolocation) {
                updateDisplayInformation("fromLocation",null,"Fetching your location....");
				document.getElementById("fromLocation").innerHTML="Fetching your location....";	
				fetch(MAZEMAP_LIST_LIPI_URL).then(function(response) {
					if (!response.ok)
						throw "Cannot Communicate with LIPI List Server";
					console.log("Get the list");
					return response.json();
				}).then(function(json) {
					if (json && json.error)
						throw "Not in JSON Format";
					if (json){
						var LIPI_URL = json.positionUrl;
						fetch(LIPI_URL).then(function(response) {
							if (!response.ok)
								throw "Cannot Communicate with LIPI Server";
							return response.json();
						}).then(function(json) {
							console.log("Get the data from LIPI");
							if (json && json.error)
								throw "Not in JSON Format";
							if (json){
								console.log("get the json");
								if (typeof json.geoLongitude === 'undefined' || typeof json.geoLatitude ==='undefined')
									throw "No Geolocation receive";
								console.log("Correct");
								var lat = Number(json.geoLatitude);
								var lng = Number(json.geoLongitude);
								var z = Number(json.z);
								myMap.flyTo({center: {lat: lat, lng: lng}, zoom: 19, duration: 2000});
								myMap.zLevel = z;
								routingInformation.start = { lngLat: {lat: lat, lng: lng}, zLevel: z};
								updateDisplayInformation("fromLocation",routingInformation.start, "Your Location");
								if (document.getElementById("fromInfo"))
									document.getElementById("fromInfo").classList.add("location-query");
								routePath(routingInformation);
							}
						}).catch(function(e) {
							console.log(e);
							deviceGeolocation("from")
						});							
					}	
				}).catch(function(e) {
					console.log(e);
					deviceGeolocation("from")
				});
											
            }
        };

    if (document.getElementById("toLocationBtn"))
        document.getElementById("toLocationBtn").onclick=function(e){
            e.preventDefault();
            if (navigator.geolocation) {
                updateDisplayInformation("toLocation",null,"Fetching your location...." );
                document.getElementById("toLocation").innerHTML="Fetching your location....";
                fetch(MAZEMAP_LIST_LIPI_URL).then(function(response) {
					if (!response.ok)
						throw "Cannot Communicate with LIPI List Server";
					console.log("Get the list");
					return response.json();
				}).then(function(json) {
					if (json && json.error)
						throw "Not in JSON Format";
					if (json){
						var LIPI_URL = json.positionUrl;
						fetch(LIPI_URL).then(function(response) {
							if (!response.ok)
								throw "Cannot Communicate with LIPI Server";
							return response.json();
						}).then(function(json) {
							console.log("Get the data from LIPI");
							if (json && json.error)
								throw "Not in JSON Format";
							if (json){
								console.log("get the json");
								if (typeof json.geoLongitude === 'undefined' || typeof json.geoLatitude ==='undefined')
									throw "No Geolocation receive";
								console.log("Correct");
								var lat = Number(json.geoLatitude);
								var lng = Number(json.geoLongitude);
								var z = isNana(json.z)?0:z;
								myMap.flyTo({center: {lat: lat, lng: lng}, zoom: 19, duration: 2000});
								myMap.zLevel = z;
								routingInformation.destination = { lngLat: {lat: lat, lng: lng}, zLevel: z};
								updateDisplayInformation("toLocation",routingInformation.destination, "Your Location");
								if (document.getElementById("toInfo"))
									document.getElementById("toInfo").classList.add("location-query");
								routePath(routingInformation);
							}
						}).catch(function(e) {
							console.log(e);
							deviceGeolocation("to")
						});							
					}	
				}).catch(function(e) {
					console.log(e);
					deviceGeolocation("to")
				});
            }
        };
};

var deviceGeolocation = function (point) {
	if (point != 'to' && point != 'from')
		return;
	navigator.geolocation.getCurrentPosition(
		function(pos) {
			var start = false;
			if (point == 'from')
				start = true;
			myMap.flyTo({center: {lat: pos.coords.latitude, lng: pos.coords.longitude}, zoom: 19, duration: 2000});
			if (start) {
				routingInformation.start = { lngLat: {lat: pos.coords.latitude, lng: pos.coords.longitude}, zLevel: 0};
				updateDisplayInformation("fromLocation",routingInformation.start, "Your Location");
			}
			else {
				routingInformation.destination = { lngLat: {lat: pos.coords.latitude, lng: pos.coords.longitude}, zLevel: 0};
				updateDisplayInformation("toLocation",routingInformation.destination, "Your Location");
			}
			
			if (document.getElementById(point+"Info"))
				document.getElementById(point+"Info").classList.add("location-query");
			routePath(routingInformation);

		},
		function (error) {
			if (point == 'to')
				geolocationDenied('to');
			if (point == 'from')
				geolocationDenied('from');
		}
	);	
};

setGeolocationButton();

var updateDisplayInformation = function(domID, position, customizeMessage) {
    if (customizeMessage === undefined)
        customizeMessage="";
    var domDocument = document.getElementById(domID);
    if (domDocument)
        if (customizeMessage)
            domDocument.innerHTML=customizeMessage;
        else
        if (position.hasOwnProperty('poiId')) {
            Mazemap.Data.getPoi(position.poiId).then( function(poi) {
				buildingName=toTitleCase(poi.properties.buildingName);
				floorName=toTitleCase(poi.properties.floorName);
				locationHTML = (buildingName?buildingName:'')+(buildingName&&floorName?', ':'')+(floorName?floorName:'');
                html = '<h4>'+ (poi.properties.title!=='null'?poi.properties.title:'')+'</h4><p>'+locationHTML+'</p>';
                domDocument.innerHTML = html;
            }).catch( function(e) {
                domDocument.innerHTML='Corresponding POI cannot be found';
            });
        } else {
            domDocument.innerHTML='Selected location';
        }
};


var geolocationDenied = function(position) {

    customizeMessage='You need to grant the permission to use this service.<br><a href="#" id="'+position+'LocationBtn">Use my location</a>, or click on the map.';
    var domDocument = document.getElementById(position+'Location');
    if (domDocument)
        domDocument.innerHTML=customizeMessage;
	setGeolocationButton();
       
};

document.getElementById("reverseDirection").onclick=function(e) {
    e.preventDefault();
    routingInformation.reserveDirection();
    reseverDirectionDisplay();
    routePath(routingInformation);
    maptrack.event("routeOptions","Click","reverseDirections");
};

document.getElementById("avoidObstacles").onclick=function(e) {
    e.preventDefault();
    routePath(routingInformation, true);
    maptrack.event("routeOptions","Click","avoidObstacles");
};

document.addEventListener('click',function(e){
    if(e.target && e.target.className== 'set-start'){
        e.preventDefault();
        routingInformation.setLastClickAsStartPosition();
        updateDisplayInformation("fromLocation",routingInformation.start);
        routePath(routingInformation);
        if (popup.isOpen())
            resultMarker.togglePopup();
    }
    if(e.target && e.target.className== 'set-end'){
        e.preventDefault();
        routingInformation.setLastClickAsDestinationPosition();
        updateDisplayInformation("toLocation",routingInformation.destination);
        routePath(routingInformation);
        if (popup.isOpen())
            resultMarker.togglePopup();
    }
});

window.onload = function() {
    var urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('pointA'))
        updateDisplayInformation("fromLocation",routingInformation.start);

    if (urlParams.has('pointB'))
        updateDisplayInformation("toLocation",routingInformation.destination);

};

var mySearchInput = new Mazemap.Search.SearchInput({
    container: document.getElementById('search-input-container'),
    input: document.getElementById('searchInput'),
    suggestions: document.getElementById('suggestions'),
    searchController: mySearch
}).on('itemclick', function(e){
    var poiFeature = e.item;
    placePoiMarker( poiFeature );
    if (poiFeature.properties.type == 'building')
        routingInformation.latestClickPos =  {lngLat: {lat: poiFeature.geometry.coordinates[1], lng: poiFeature.geometry.coordinates[0]}, zLevel: myMap.zLevel};
    else
        routingInformation.latestClickPos = {poiId: poiFeature.properties.poiId};
    popup.setHTML(popupPoiHTML(poiFeature));
    if (!popup.isOpen())
        resultMarker.togglePopup();
});