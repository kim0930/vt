class Location extends THREE.Mesh {
    constructor(texture) {
        var geometry = new THREE.SphereGeometry(200, 50, 30);
        geometry.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));

        var material = new THREE.MeshBasicMaterial ({
            map: texture
        });

        // Now use `super()` to call the constructor of the parent class (THREE.Mesh)
        super(geometry, material);
    }

    /**
     * Adds Hotspots to current location
     * @param {Object} parameters Parameters for Hotspots like images, content, and audio.
     * @returns {Hotspot} Hotspots specified in json
     */
    addHotspot(parameters) {
        var hotspot = new Hotspot(parameters);
        this.add(hotspot);
        return hotspot;
    }

    /**
     * Adds transitions to current location
     * @param {Object} parameters like target location
     * @returns {Transition} Transitions specified in json
     */
    addTransition(parameters) {
        var transition = new Transition(parameters);
        this.add(transition);
        return transition;
    }

    /**
     * Configures the map for the location
     * @param {Object} parameters dictionary that should have fields: image, mapSpots.
     * @param {string} locationUid Unique ID for location
     */
    configureMap(parameters, locationUid) {
        var map = _('map');
        if (!map) {
            return;
        }

        for (var i = map.childNodes.length - 1; i > 0; i--) {
            if (map.childNodes[i].id === "mapSpot" || map.childNodes[i].id === "mapSpotCurrent" || map.childNodes[i].id === "mapCamera" ) {
                map.removeChild(map.childNodes[i]);
            }
        }

        if (parameters.hasOwnProperty('image')) {
            var image = _('mapImage');
            if (image) {
                image.src = datesJsonUrl + parameters['image'];
            }
        } else {
            console.log("error: no map image provided!");
        }

        if (parameters.hasOwnProperty('mapSpots')) {
            var spots = parameters['mapSpots'];
            spots.forEach(function (spot) {
                var spotButton = document.createElement("button");
                spotButton.style.position = "absolute";
                if (spot.uid === locationUid) {
                    spotButton.id = "mapSpotCurrent";
                    
                    // mapCamera setting
                    var viewPort = document.createElement("button");
                    viewPort.id = "mapCamera";
                    viewPort.style.left = (spot.mapPosX  - 12.5) + "px";
                    viewPort.style.top = (spot.mapPosY ) + "px";
                    viewPort.dataset.originalX =  (spot.mapPosX - 12.5) / 300; // 300px 기준 상대 좌표 저장
                    viewPort.dataset.originalY = (spot.mapPosY)/ 200; // 200px 기준 상대 좌표 저장
    
                    map.appendChild(viewPort)
                } else {
                    spotButton.id = "mapSpot";
                }
                spotButton.dataset.originalX = (spot.mapPosX - 15/2) / 300; // 300px 기준 상대 좌표 저장
                spotButton.dataset.originalY = (spot.mapPosY - 15/2)/ 200; // 200px 기준 상대 좌표 저장

                spotButton.style.left = (spot.mapPosX - 15/2) + "px";
                spotButton.style.top = (spot.mapPosY  - 15/2) + "px";
                console.log(spotButton.offsetWidth, spotButton.offsetHeight)

                // spotButton.style.left = (spot.mapPosX) + "px";
                // spotButton.style.top = (spot.mapPosY) + "px";
                spotButton.addEventListener('mousedown', function (event) {
                    event.preventDefault();
                    transitToLocation(spot.uid);
                });
                spotButton.addEventListener('touchstart', function (event) {
                    event.preventDefault();
                    transitToLocation(spot.uid);
                });
                map.appendChild(spotButton);
            });
        }

        // Position of Map
        map.style.display = "block";
        map.style.left = 2 + "px";
        map.style.top = 2 + "px";       
    }
}

