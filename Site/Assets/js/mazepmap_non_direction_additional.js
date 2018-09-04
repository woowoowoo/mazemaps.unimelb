if (document.getElementById('search-input-container'))
    var mySearchInput = new Mazemap.Search.SearchInput({
        container: document.getElementById('search-input-container'),
        input: document.getElementById('searchInput'),
        suggestions: document.getElementById('suggestions'),
        searchController: mySearch
    }).on('itemclick', function(e){
        var poiFeature = e.item;
        placePoiMarker( poiFeature );
        popup.setHTML(popupPoiHTML(poiFeature));    
        if (!popup.isOpen())
            resultMarker.togglePopup();
        }
    );

myMap.on('click', function(e) {
    var lngLat = e.lngLat;
    var zLevel = myMap.zLevel;
    myMap.highlighter.clear();
    resultMarker
    .setLngLat(lngLat)
    .setZLevel(zLevel)
    .addTo(myMap);
    
    popup.setHTML(popupLatLngHTML(lngLat, zLevel));

    Mazemap.Data.getPoiAt(lngLat, zLevel).then( poi => {
        clickPoiMarker(poi);
    }).catch( function(error){
        if (!popup.isOpen())
             resultMarker.togglePopup();
    });

});

function popupPoiHTML(poi) {
    if (poi.properties.type == 'building')
        	return '<h4>'+ (poi.properties.title!='null'?poi.properties.title:'')+'</h4><p>'+(poi.properties.buildingName?toTitleCase(poi.properties.buildingName):'')+(poi.properties.floorName?', Floor '
	+toTitleCase(poi.properties.floorName):'')+'</p><p><strong>Get directions:<strong></p><p><a href="https://maps.unimelb.edu.au/dir?lngA='+poi.geometry.coordinates[0]+'&latA='+poi.geometry.coordinates[1]+'&zA='+myMap.zLevel+'" class="set-start">Start Here</a> or <a href="https://maps.unimelb.edu.au/dir?lngB='+poi.geometry.coordinates[0]+'&latB='+poi.geometry.coordinates[1]+'&zB='+myMap.zLevel+'" class="set-end">End here</a></p>';
    else
    	return '<h4>'+ (poi.properties.title!='null'?poi.properties.title:'')+'</h4><p>'+(poi.properties.buildingName?toTitleCase(poi.properties.buildingName):'')+(poi.properties.floorName?', Floor '
	+toTitleCase(poi.properties.floorName):'')+'</p><p><strong>Get directions:<strong></p><p><a href="https://maps.unimelb.edu.au/dir?pointA='+poi.properties.poiId+'" class="set-start">Start Here</a> or <a href="https://maps.unimelb.edu.au/dir?pointB='+poi.properties.poiId+'" class="set-end">End here</a></p>';
}

function popupLatLngHTML(lngLat, zLevel) {
    return '<p><strong>Get directions:<strong></p><p><a href="https://maps.unimelb.edu.au/dir?lngA='+lngLat.lng+'&latA='+lngLat.lat+'&zA='+zLevel+'" class="set-start">Start Here</a> or <a href="https://maps.unimelb.edu.au/dir?lngB='+lngLat.lng+'&latB='+lngLat.lat+'&zB='+zLevel+'" class="set-end">End here</a></p>';
}