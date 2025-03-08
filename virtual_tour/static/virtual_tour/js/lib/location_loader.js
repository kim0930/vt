/**
 * LocationLoader
 * @constructor
 */
LocationLoader = function () {
};

//TODO: targetList, panoramaData unknown, should check if properties of panoramaData exists
/**
 * load Location with uid, adds all hotspots and transitions for the location.
 * @param uid UID of Location
 * @param onLoadComplete callback, gets called when loading complete
 */
LocationLoader.prototype.loadLocation = function (uid, onLoadComplete) {
    var location;
    panoramaData.locations.forEach(function (item, index) {
        if (item.uid === undefined || uid === undefined) {
            console.log("error: uid undefined");
            return;
        }
        if (item.uid !== uid) {
            return
        }

        var imgUrl = item.image.default;
        if (resolution === "mobile") {
            imgUrl = item.image.mobile;
        } else if (resolution === "hq") {
            imgUrl = item.image.hq;
        }
        imgUrl = datesJsonUrl + imgUrl

        // Use TextureLoader instead of deprecated ImageUtils.loadTexture
        var loader = new THREE.TextureLoader();
        loader.load(
            imgUrl,
            function (texture) {
                location = new Location(texture);

                // 기본 정보 설정
                location.cameraTargets = item.cameraTargets;
                location.uid = item.uid;
                location.mapUid = item.mapUid;
                
                // depthMap 정보 설정
                if (item.depthMap) {
                    location.depthMap = {};
                    location.depthMap.default = datesJsonUrl + item.depthMap.default;
                    location.depthMap.hq = datesJsonUrl + item.depthMap.hq;
                    location.depthMap.mobile = datesJsonUrl + item.depthMap.mobile;
                }

                //Hotspots
                item.hotspots.forEach(function (hotspot) {
                    var hData = hotspot;
                    var hParam = {
                        position: new THREE.Vector3(hData.posX, hData.posY, hData.posZ),
                        content: hData.text,
                        title: hData.title,
                        images: hData.images,
                        audio: hData.audio,
                        tooltip: hData.tooltip
                    };
                    location.addHotspot(hParam);
                });

                //Transitions
                item.transitions.forEach(function (transition) {
                    var tData = transition;
					panoramaData.locations.forEach(function (item, index) {
                        if (item.uid === tData.target_location) {
							var imgUrl = item.image.default;
							if (resolution === "mobile") {
								imgUrl = item.image.mobile;
							} else if (resolution === "hq") {
								imgUrl = item.image.hq;
							};	
						}						
                    })
								
                    var tParam = {
                        position: new THREE.Vector3(tData.posX, tData.posY, tData.posZ),
                        targetLocation: tData.target_location,
                        tooltip: tData.tooltip,
						targetLocation_image: imgUrl,
                    };
                    location.addTransition(tParam);
                });

                // loading map
                for (var i = 0; i < panoramaData.maps.length; i++) {
                    if (panoramaData.maps[i].uid == item.mapUid) {
                        location.configureMap(panoramaData.maps[i], item.uid);
                        break;
                    }
                }
                onLoadComplete(location);
            }
        );
    });
};
