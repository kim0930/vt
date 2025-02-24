/**
 *  (c) Julius Peinelt
 *  	Anna Neovesky - Digitale Akademie, Akademie der Wissenschaften und der Literatur | Mainz - Anna.Neovesky@adwmainz.de
 */


/*
 * global vars
 */
var camera, scene, renderer;
var isUserInteracting = false;
var isMeasureMode = false;
var isPopupOpen = false;
var isResizing = false;
var lon = 0;
var lat = 0;
var lonFactor = 0;
var latFactor = 0;
var phi = 0;
var theta = 0;
var mouse = {x: 0, y: 0};
var targetList = [];
var hoverIntersected;
var composer, transitionComposer;
var panoramaData;
var panoramaDates= []; 
var isLoading = false;
var lastPanoramaUID = -1;
var mapUid = 0;
var map_height = 200
var map_width = 300
var aspectRatio = map_width / map_height; // 초기 비율
var toolTip;
var isMapMinimized = false; // 초기 상태: 확장
var timerId;
var resolution = "default";

// 캘린더용
var target_dataURL;
let availableDates = [], currentDateIndex = 0;
var selectedDate;
var selectedDateStr;
var copiedDate;  // 새로운 Date 객체를 만들어 복사 (3개월 표시 캘린더 렌더링용)
let calendar 
// 캘린더용

let viewPort
let animationId = null;

// Measurement mode
let points = [];


/**
 * Starts panorama, creates a loading scene and triggers the loading of the start location. Starts animating.
 * @param dataURL URL to the config JSON
 */

function startVTProject(dataURL, res, projectId) {
	console.log(dataURL)
	fetch(dataURL)
	.then(respon => respon.json())
	.then(data => {
		data["dates"].forEach(function (item) {
			availableDates.push(item["date"]);
			panoramaDates.push(item)
			if (data["startDate"] === item["uid"]){
				// target_dataURL = item["json_filepath"];
				currentDateIndex = data["startDate"]-1;
				selectedDateStr = item["date"]
				selectedDate = new Date(selectedDateStr)
				copiedDate = new Date(selectedDateStr)			
			}
		});
		init();
		startPanorama(selectedDateStr, res, projectId)
	});
}

function startPanorama(renderedDateStr, res, projectId) {
	/*
	renderedDate: Date()
	*/
	target_dataURL = find_dataURL(renderedDateStr)
	target_dataURL = datesJsonUrl + target_dataURL
	// console.log("생선된 파노라마 날짜:", renderedDateStr);
	// console.log("생선된 파노라마 target_dataURL:", target_dataURL);
	selectedDate = new Date(renderedDateStr)
	copiedDate = new Date(selectedDateStr)	

	resolution = res;
	setMapandNavigationHidden(true);
	isLoading = true;
	parseConfigJSON(target_dataURL, function (panodata) {
		var loader = new LocationLoader();
		loader.loadLocation(panodata.startLocation, startComplete);
	});
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    animationId = requestAnimationFrame(animate);
}

function Date2DateStr(renderedDate) {
	const year = renderedDate.getFullYear(); // 2023
	const month = (renderedDate.getMonth() + 1).toString().padStart(2, '0'); // 06
	const day = renderedDate.getDate().toString().padStart(2, '0'); // 18
	const dateString = year + '-' + month + '-' + day; // 2023-06-18
	return dateString;
}

function find_dataURL(renderedDateStr) {
	panoramaDates.forEach(function (item) {
		if (renderedDateStr === item["date"]){
			target_dataURL = item["json_filepath"];
		};
	});
	return target_dataURL;
}

/**
 * Initialize Tooltip for Hotspots and Transitions.
 */
function initTooltip() {
	toolTip = _('toolTip');
}

/**
 * Loads and parses the config JSON file at given URL, when finished parsing it calls given callback.
 * @param dataURL URL to config JSON.
 * @param callback function that gets called after parsing is finished.
 */
function parseConfigJSON(dataURL, callback) {
	var request = new XMLHttpRequest();
	request.open("GET", dataURL, true);
	request.onreadystatechange = function () {
		if (request.readyState === 4 && request.status === 200) {
			panoramaData = JSON.parse(request.responseText);
			callback(panoramaData);
		}
	};
	request.send(null);
}


/**
 * Initializes renderer, camera, projector, tooltip
 */
function init() {
	camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 200);
	camera.target = new THREE.Vector3(0, 0, 1);
	if (Detector.webgl) {
	  renderer = new THREE.WebGLRenderer({antialias: true});
	} else {
	  renderer = new THREE.CanvasRenderer();
	}
	renderer.setSize(window.innerWidth, window.innerHeight);
	var container = _('panorama');
	container.appendChild(renderer.domElement);
	initTooltip()	
	initEventListener();
	calendar = new Calendar();
}

/**
 * Callback when Loading of scene is complete, initializes event listeners and shader.
 * @param location that will be rendered
 */
function startComplete(location) {
	var panoScene = new THREE.Scene();
	panoScene.add(location);
	scene = panoScene;
	var cts = location.cameraTargets;
	lat = cts[-1].lat;
	lon = cts[-1].lon;
	lastPanoramaUID = location.uid;
	mapUid = location.mapUid;
	updateSceneSwitchButton();
	updateTargetList();
	setupDarkBlurShader();
	setupBrightBlurShader();
	isLoading = false;
	setMapandNavigationHidden(false);

	// 📌 갱신된 날짜로 캘린더 다시 생성
	_('current-date').textContent = selectedDateStr;
	calendar.regenerate(selectedDate); 
}


/**
 * Updates the Array of clickable objects in the scene.
 */
function updateTargetList() {
	targetList = [];
	scene.traverse(function (object) {
		if (object instanceof Hotspot || object instanceof Transition) {
			targetList.push(object);
			object.lookAt(camera.position);
		}
	});
}


/**
 * Transit to given location and rotate camera accordingly.
 * @param locationIndex Index of target location.
 * @param reset if true camera rotates as if it is a start location.
 */
function transitToLocation(locationIndex, reset) {
	if (reset) {
		lastPanoramaUID = -1; //update lastPanoramaUID to current location.uid for transition
	}
	if (locationIndex === lastPanoramaUID) {
		return;
	}
	isLoading = true;

	setMapandNavigationHidden(true);

	setTimeout(function () {    // Hack
		var loader = new LocationLoader();
		loader.loadLocation(locationIndex, function (location) {
			var panoScene = new THREE.Scene();
			panoScene.add(location);
			scene = panoScene;
			var cts = location.cameraTargets;
			if (cts[lastPanoramaUID]) {
				lat = cts[lastPanoramaUID].lat;
				lon = cts[lastPanoramaUID].lon;
			} else if (cts[-1]) {
				lat = cts[-1].lat;
				lon = cts[-1].lon;
			} else {
				lat = 2;
				lon = -103;
			}

			// console.log("target:", location.uid, lat, lon)

			lastPanoramaUID = location.uid;
			mapUid = location.mapUid;
			updateSceneSwitchButton();
			updateTargetList();
			setupDarkBlurShader();
			setupBrightBlurShader();
			isLoading = false;
			setMapandNavigationHidden(false);
			camera.fov = 60;
			camera.updateProjectionMatrix();
		});
	}, 50);
}

/**
 * Adds EventListeners to scene.
 */
function initEventListener() {
	var container = _('panorama');
	THREEx.FullScreen.bindKey({charCode: 'f'.charCodeAt(0), element: _('panorama')});

	container.addEventListener('mousedown', onPointerDown, false);
	container.addEventListener('mousemove', onMouseMove, false);
	container.addEventListener('mouseup', onMouseUp, false);
	container.addEventListener('mousewheel', onMouseWheel, false);
	container.addEventListener('DOMMouseScroll', onMouseWheel, false);

	container.addEventListener('touchstart', onDocumentTouchStart, false);
	container.addEventListener('touchmove', onDocumentTouchMove, false);
	container.addEventListener('touchend', onDocumentTouchEnd, false);


	container.addEventListener('dragover', function (event) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
	}, false);
	container.addEventListener('dragenter', function (event) {
		document.body.style.opacity = 0.5;
	}, false);
	container.addEventListener('dragleave', function (event) {
		document.body.style.opacity = 1;
	}, false);
	container.addEventListener('drop', function (event) {
		event.preventDefault();
		var reader = new FileReader();
		reader.addEventListener('load', function (event) {
			material.map.image.src = event.target.result;
			material.map.needsUpdate = true;

		}, false);
		reader.readAsDataURL(event.dataTransfer.files[0]);
		document.body.style.opacity = 1;
	}, false);
	document.addEventListener('keydown', onKeyDown, false);
	document.addEventListener('keyup', onKeyUp, false);

	window.addEventListener('resize', onWindowResize, false);

	_('infoCloseButton').addEventListener('click', function (event) {
		var audioControls = _('audioControls');
		audioControls.pause();
		var div = _("infoView");
		div.style.display = "none";
		isPopupOpen = false;
		setMapandNavigationHidden(false);
	}, false);
	_('infoCloseButton').addEventListener('touched', function (event) {
		var audioControls = _('audioControls');
		audioControls.pause();
		var div = _("infoView");
		div.style.display = "none";
		isPopupOpen = false;
		setMapandNavigationHidden(false);
	}, false);
	var map = _(map);
	if (map) {
		_('map').addEventListener('dragstart', function (event) {
			event.preventDefault();
		});
	}

	var navGroup = _('navigationButtonsContainer');
	if (navGroup) {
		_('upNavButton').addEventListener('mousedown', function (event) {
			isUserInteracting = true;
			latFactor = 0.5;
		}, false);
		_('downNavButton').addEventListener('mousedown', function (event) {
			isUserInteracting = true;
			latFactor = -0.5;
		}, false);
		_('leftNavButton').addEventListener('mousedown', function (event) {
			isUserInteracting = true;
			lonFactor = -0.5;
		}, false);
		_('rightNavButton').addEventListener('mousedown', function (event) {
			isUserInteracting = true;
			lonFactor = 0.5;
		}, false);
		_('zoomInButton').addEventListener('mousedown', function (event) {
			zoom(-2)
		}, false);
		_('zoomOutButton').addEventListener('mousedown', function (event) {
			zoom(2)
		}, false);
		_('navigationButtonsContainer').addEventListener('mouseup', onMouseUp, false);

		_('upNavButton').addEventListener('touchstart', function (event) {
			isUserInteracting = true;
			latFactor = 0.5;
		}, false);
		_('downNavButton').addEventListener('touchstart', function (event) {
			isUserInteracting = true;
			latFactor = -0.5;
		}, false);
		_('leftNavButton').addEventListener('touchstart', function (event) {
			isUserInteracting = true;
			lonFactor = -0.5;
		}, false);
		_('rightNavButton').addEventListener('touchstart', function (event) {
			isUserInteracting = true;
			lonFactor = 0.5;
		}, false);
		_('zoomInButton').addEventListener('touchstart', function (event) {
			zoom(-2)
		}, false);
		_('zoomOutButton').addEventListener('touchstart', function (event) {
			zoom(2)
		}, false);
		_('navigationButtonsContainer').addEventListener('touchend', onMouseUp, false);
	}

	var sceneSwitch = _('sceneSwitch')
	if (sceneSwitch) {
		_('sceneSwitch').addEventListener('mousedown', switchScene);
		_('sceneSwitch').addEventListener('touchstart', switchScene);
	}

	var fullscreen = _('fullscreen');
	if (fullscreen) {
		_('fullscreen').addEventListener('mousedown', toggleFullScreen);
		_('fullscreen').addEventListener('touchstart', toggleFullScreen);
	}
	var date_nav = _('date-nav');
	if (date_nav) {
        // 🔥 캘린더 클릭
        _("current-date").addEventListener("click", () => {
            let calendarModal = _("calendar-modal");
			// if (calendarModal.style.display === "none"){
			// 	calendarModal.style.display =  "block";
			// 	isPopupOpen = true

			// } else {
			// 	calendarModal.style.display =  "none";
			// 	isPopupOpen = false
			// 	console.log(isPopupOpen)
			// }
            calendarModal.style.display = (calendarModal.style.display === "none") ? "block" : "none";
			
			let currentDateText = _("current-date").textContent;
			currentDateIndex = availableDates.indexOf(currentDateText);
        	if (!currentDateText || currentDateText === "Loading...") return;
			selectedDateStr = currentDateText;
            selectedDate = new Date(currentDateText);
            copiedDate = new Date(selectedDate)
			calendar.regenerate(selectedDate); // 📌 갱신된 날짜로 캘린더 다시 생성
		});

        _('prev-date').addEventListener('click', () => {
            if (currentDateIndex > 0) {
				currentDateIndex--;
				_('current-date').textContent = availableDates[currentDateIndex];

				let currentDateText = _("current-date").textContent;
				if (!currentDateText || currentDateText === "Loading...") return;
				selectedDateStr = currentDateText;
				selectedDate = new Date(currentDateText);
				copiedDate = new Date(selectedDate)
				startPanorama(selectedDateStr, resolution);
            }
        });
    
        _('next-date').addEventListener('click', () => {
            if (currentDateIndex < availableDates.length-1) {
                currentDateIndex++;
				_('current-date').textContent = availableDates[currentDateIndex];
				
				let currentDateText = _("current-date").textContent;
				if (!currentDateText || currentDateText === "Loading...") return;
				selectedDateStr = currentDateText;
				selectedDate = new Date(currentDateText);
				copiedDate = new Date(selectedDate)
				startPanorama(selectedDateStr, resolution);

            } 

        });

        // 📌 이전 달 버튼 클릭 이벤트
        _("prev-month").addEventListener("click", () => {
            // selectedDate.setMonth(selectedDate.getMonth() - 1);
            copiedDate.setMonth(copiedDate.getMonth() - 1);
            calendar.regenerate(copiedDate)
            console.log("prev-month", copiedDate)

        });

        // 📌 다음 달 버튼 클릭 이벤트
        _("next-month").addEventListener("click", () => {
            //selectedDate.setMonth(selectedDate.getMonth() + 1);
            copiedDate.setMonth(copiedDate.getMonth() + 1);
            calendar.regenerate(copiedDate)
            console.log("next-month", copiedDate)

        });		
	}

	var toggleMap = _("toggleMap");
	var mapContainer = _("mapContainer");
	var map = _("map");
	var mapImage = _("mapImage");

	toggleMap.addEventListener("click", function () {
		if (isMapMinimized) {
			mapContainer.style.height = map_height+"px"; // 원래 크기
			mapContainer.style.width = map_width+"px";
			toggleMap.innerText = "−"; // 축소 버튼
		} else {
			mapContainer.style.height = "0px"; // 최소화 (제목 정도만 보이게)
			mapContainer.style.width = "0px";
			toggleMap.innerText = "+"; // 확장 버튼
		}
		isMapMinimized = !isMapMinimized;
		updateResizeHandlePosition(); // 크기 변경 후 resizeHandle 위치 조정
	});
	
	// map 크기 조절 기능
	var resizeHandle = _("resizeHandle");
	resizeHandle.addEventListener("click", function (event) {
		isResizing = true;
		isUserInteracting = false; 
		event.preventDefault();
	});

	// 치수 측정 모드
	var measureModeBtn = _("measureModeBtn");
	measureModeBtn.addEventListener("click", function (event){
		isMeasureMode = true; 
		if (measureModeBtn) measureModeBtn.style.display = 'none';
		if (measureModeExitBtn) measureModeExitBtn.style.display = 'block';

		points = []; // 초기화
		alert("첫 번째 점을 클릭하세요.");
		event.preventDefault();
	});

	// 치수 측정 모드 종료 
	var measureModeExitBtn = _("measureModeExitBtn");
	measureModeExitBtn.addEventListener("click", function (event){
		isMeasureMode = false; 
		if (measureModeBtn) measureModeBtn.style.display = 'block';
		if (measureModeExitBtn) measureModeExitBtn.style.display = 'none';
		console.log(isMeasureMode)
		event.preventDefault();
	});


}

// 두 점을 연결하는 선 그리기
function drawLine(p1, p2) {
    let line = document.createElement("div");
    line.style.position = "absolute";
    line.style.left = `${p1.x}px`;
    line.style.top = `${p1.y}px`;
    line.style.width = `${Math.hypot(p2.x - p1.x, p2.y - p1.y)}px`;
    line.style.height = "2px";
    line.style.background = "red";
    line.style.transform = `rotate(${Math.atan2(p2.y - p1.y, p2.x - p1.x)}rad)`;
    document.body.appendChild(line);
}

// 두 점 사이 거리 계산
function calculateDistance(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

// 측정된 거리 표시
function displayMeasurement(p1, p2, distance) {
    let label = document.createElement("div");
    label.style.position = "absolute";
    label.style.left = `${(p1.x + p2.x) / 2}px`;
    label.style.top = `${(p1.y + p2.y) / 2}px`;
    label.style.color = "white";
    label.style.background = "black";
    label.style.padding = "2px 5px";
    label.innerText = `${distance.toFixed(100)} px`;
    document.body.appendChild(label);
}

function toggleFullScreen(event) {
	if (THREEx.FullScreen.activated()) {
		THREEx.FullScreen.cancel();
	} else {
		THREEx.FullScreen.request(_('panorama'));
	}
}

/**
 * Switch scene between start location for map 1 and map 2
 * @param event not used
 */
function switchScene(event) {
	if (mapUid === 1) {
		transitToLocation(98, true);
	} else {
		transitToLocation(12, true);
	}
}

/**
 * Updates Scene Switch button.
 */
function updateSceneSwitchButton() {
	var button = _('sceneSwitch');
	if (button) {
		if (mapUid === 1) {
			button.textContent = 'Switch Scene';
		} else {
			button.textContent = 'Switch Scene';
		}
	}
}

/**
 * hides or unhides map and navigation group when switching scenes
 * @param hidden if true, hide map and navigation group.
 */
function setMapandNavigationHidden(hidden) {
	var map = _('map');
	var navButtons = _('navigationButtonsContainer');
	var about = _('about');
	var sceneSwitch = _('sceneSwitch');
	if (hidden) {
		if (map) map.style.display = 'none';
		if (navButtons) navButtons.style.display = 'none';
		if (about) about.style.display = 'none';
		if (sceneSwitch) sceneSwitch.style.display = 'none';
	} else {
		if (map) map.style.display = 'block';
		if (navButtons) navButtons.style.display = 'block';
		if (about) about.style.display = 'block';
		if (sceneSwitch) sceneSwitch.style.display = 'block';
	}

}



/**
 * 맵 크기에 맞게 spotButton 위치를 동적으로 업데이트
 * @param {number} newWidth 새로운 맵 너비
 * @param {number} newHeight 새로운 맵 높이
 */
function updateSpotPositions(newWidth, newHeight) {
    var mapSpots = document.querySelectorAll("#mapSpot, #mapSpotCurrent, #mapCamera");
    mapSpots.forEach(function (spot) {
        var originalX = parseFloat(spot.dataset.originalX);
        var originalY = parseFloat(spot.dataset.originalY);
        spot.style.left = (originalX * newWidth) + "px";
        spot.style.top = (originalY * newHeight) + "px";
    });
}

/**
 * resizeHandle을 mapContainer의 오른쪽 아래에 고정
 */
function updateResizeHandlePosition() {
    resizeHandle.style.right = "0px";
    resizeHandle.style.bottom = "0px";
}

function updateToggleButtonPosition() {
    var toggleButton = document.getElementById("toggleMap");
    toggleButton.style.top = "5px";
    toggleButton.style.left = "5px";
}

/**
 * Updates camera and renderer if window gets resized.
 * @param event not used.
 */
function onWindowResize(event) {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * EvenListener if mouse is pressed, calls downEventHandler.
 * @param event mouse event
 */
function onPointerDown(event) {
	var eventX = event.pageX;
	var eventY = event.pageY;
	downEventHandler(eventX, eventY, event);
}

/**
 * EventListener if mouse is moving, calls moveEventHandler.
 * @param event mouse event
 */
function onMouseMove(event) {
	var eventX = event.pageX;
	var eventY = event.pageY;
	moveEventHandler(eventX, eventY, event);
}

/**
 * EventListener if mouse is up, calls upEventHandler.
 * @param event mouse event
 */
function onMouseUp(event) {
	upEventHandler(event);
}

/**
 * EventListener if mouse wheel is used
 * @param event mouse event
 */
function onMouseWheel(event) {
	wheelEventHandler(event.pageX, event.pageY, event);
}

/**
 * EventListener for starting touch events
 * @param event touch event
 */
function onDocumentTouchStart(event) {
	if (event.touches.length === 1) {
		var touchX = event.touches[0].pageX;
		var touchY = event.touches[0].pageY;
		downEventHandler(touchX, touchY, event);
	} else if (event.touches.length === 2) {
	}
}

/**
 * EventListener for moving touch events
 * @param event touch event
 */
function onDocumentTouchMove(event) {
	if (event.touches.length === 1) {
		var touchX = event.touches[0].pageX;
		var touchY = event.touches[0].pageY;
		moveEventHandler(touchX, touchY, event);
	}
}

/**
 * EventListener for ending touch events
 * @param event touch event
 */
function onDocumentTouchEnd(event) {
	upEventHandler(event);
}

/**
 * Handler for move Event inputs.
 * @param eventX x-Value of event
 * @param eventY y-Value of event
 * @param event input event
 */

function moveEventHandler(eventX, eventY, event) { 
    // Position of toolTips
    toolTip.style.left = eventX + 20 + "px";
    toolTip.style.top = eventY + 20 + "px";

    if (isPopupOpen || isMeasureMode) {
        return;
    }

    mouse.x = (eventX / window.innerWidth) * 2 - 1;
    mouse.y = -(eventY / window.innerHeight) * 2 + 1;

    if (isUserInteracting === true) {
        lonFactor = mouse.x;
        latFactor = mouse.y;
		// console.log("drawTriangle")
		// drawTriangle()
    } else {
        // check if mouse intersects something (to let it glow)
        var vector = new THREE.Vector3(mouse.x, mouse.y, 0);
        vector.unproject(camera); // ? r128 ������� ����

        var ray = new THREE.Raycaster();
        ray.set(camera.position, vector.sub(camera.position).normalize());

        // create an array containing all objects in the scene with which the ray intersects
        var intersects = ray.intersectObjects(targetList, true); // ? recursive �ɼ� �߰�

        // if there is one (or more) intersections
        if (intersects.length > 0) {
            if (intersects[0].object !== hoverIntersected) {
                if (hoverIntersected) {
                    hoverIntersected.material.color.setHex(hoverIntersected.currentHex);
                }
                hoverIntersected = intersects[0].object;

                // store color of closest object (for later restoration)
                hoverIntersected.currentHex = hoverIntersected.material.color.getHex();
                // set a new color for closest object
                hoverIntersected.material.color.setHex(0x917d4d);

                // Tooltip
                if (intersects[0].object.tooltip) {
                    toolTip.innerHTML = intersects[0].object.tooltip;
                    toolTip.style.display = "block";
                } else {
                    toolTip.innerHTML = "";
                    toolTip.style.display = "none";
                }
            }
        } else {
            if (hoverIntersected) {
                hoverIntersected.material.color.setHex(hoverIntersected.currentHex);
            }
            hoverIntersected = null;
            toolTip.style.display = "none";
        }
    }
	if (isResizing && !isMapMinimized && !isUserInteracting) { // 최소화 상태에서는 크기 조절 불가
		var newWidth = event.clientX - mapContainer.offsetLeft;
		var newHeight = newWidth / aspectRatio; // 비율 유지
		console.log(newWidth, newHeight, aspectRatio)
		if (newWidth > 100 && newHeight > 50) { // 최소 크기 제한
			mapContainer.style.width = newWidth + "px";
			mapContainer.style.height = newHeight + "px";
			updateSpotPositions(newWidth, newHeight); // 스팟 위치 조정
			updateResizeHandlePosition(); // resizeHandle 위치 업데이트
			updateToggleButtonPosition(); // 🔹 리사이징 후 버튼 위치 업데이트
		}
	}
}


/**
 * Handler for starting input events.
 * @param eventX x-Value of event
 * @param eventY y-Value of event
 * @param event input event
 */
function downEventHandler(eventX, eventY, event) { 
    if (isPopupOpen) {
        return;
    }

    if (isMeasureMode) {
		let x = event.clientX;
		let y = event.clientY;
	
		points.push({ x, y });
		if (points.length === 1) {
			alert("다음 점을 클릭하세요.");
		} else if (points.length === 2) {
			drawLine(points[0], points[1]);
			let distance = calculateDistance(points[0], points[1]); // 거리 계산
			displayMeasurement(points[0], points[1], distance);
			isMeasureMode = false; // 측정 완료 후 비활성화
			points = []
		}
	
		console.log(points)
        return;
    };





    event.preventDefault();

    // update the mouse variable
    mouse.x = (eventX / window.innerWidth) * 2 - 1;
    mouse.y = -(eventY / window.innerHeight) * 2 + 1;

    // find intersections
    var vector = new THREE.Vector3(mouse.x, mouse.y, 0);
    vector.unproject(camera); // ? r128 ������� ����

    var ray = new THREE.Raycaster();
    ray.set(camera.position, vector.sub(camera.position).normalize());

    // create an array containing all objects in the scene with which the ray intersects
    var intersects = ray.intersectObjects(targetList, true); // ? recursive �ɼ� �߰�

    // if there is one (or more) intersections
    if (intersects.length > 0) {
        intersects[0].object.onClick();
        if (intersects[0].object instanceof Hotspot) {
            isPopupOpen = true;
        }
    } else {
        lonFactor = mouse.x;
        latFactor = mouse.y;
        isUserInteracting = true;
    }
    toolTip.style.display = "none";
}


/**
 * Handler for ending input events.
 * @param event not used
 */
function upEventHandler(event) {
	lonFactor = 0;
	latFactor = 0;
	isUserInteracting = false;
	isResizing = false;
}

/**
 * EventListener for mouse wheel events.
 * @param eventX x-Value of event
 * @param eventY y-Value of event
 * @param event input event
 */
function wheelEventHandler(eventX, eventY, event) {
	event.preventDefault();
	if (isPopupOpen || isMeasureMode) {
		return;
	}

	// WebKit
	if (event.wheelDeltaY) {
		camera.fov -= event.wheelDeltaY * 0.05;

		// Opera / Explorer 9
	} else if (event.wheelDelta) {
		camera.fov -= event.wheelDelta * 0.05;

		// Firefox
	} else if (event.detail) {
		camera.fov += event.detail * 1.0;
	}

	if (camera.fov > 60) {
		camera.fov = 60;
	} else if (camera.fov < 40) {
		camera.fov = 40;
	}
	camera.updateProjectionMatrix();
}

/**
 * Zooms scene.
 * @param amount zoom amount.
 */
function zoom(amount) {
	camera.fov += amount;
	if (camera.fov > 60) {
		camera.fov = 60;
	} else if (camera.fov < 40) {
		camera.fov = 40;
	}
	camera.updateProjectionMatrix();
}

/**
 * EventListener if & which key is down => for Key Navigation
 * @param event key event
 */
function onKeyDown(event) {
	isUserInteracting = true;
	if (event.keyCode === 37) {
		// left arrow
		lonFactor = -0.5;
	} else if (event.keyCode === 38) {
		// up arrow
		latFactor = 0.5;
	} else if (event.keyCode === 39) {
		// right arrow
		lonFactor = 0.5
	} else if (event.keyCode === 40) {
		// down arrow
		latFactor = -0.5;
	}
}

/**
 * Eventlistener if key is up => no navigation via keys.
 * @param event key event
 */
function onKeyUp(event) {
	lonFactor = 0;
	latFactor = 0;
	isUserInteracting = false;
}


/**
 * Updates mouse cursor depending of function arguments
 * @param elem element mouse hovers
 * @param cursorStyle style of cursor
 */
function updateCursor(elem, cursorStyle) {
	elem.style.cursor = cursorStyle;
}


/**
 * Shows about box.
 * @param event mouse/touch event, not used
 */
function showAbout(event) {
	var aboutBox = document.getElementById('aboutView');
	aboutBox.style.display = "block";
	isPopupOpen = true;
}

/**
 * Update for new frame from Browser.
 */
function animate() {
	animationId = requestAnimationFrame(animate);
	update();
}

/**
 * Redraw the scene with new calculated camera target, blur, ...
 */
function update() {
	if (!scene) {
		return;
	}
	if (!isUserInteracting && !timerId) {
		timerId = setTimeout(resetPanorama, 2 * 60 * 1000);
	} else if (isUserInteracting && timerId) {
		clearTimeout(timerId);
		timerId = null;
	}

	// if popUp is not open
	if (!isPopupOpen) {
		lon = (lon + lonFactor) % 360;
		lat = lat + latFactor;
		// console logs: coordinates for starting view of a location
		//console.log("Camera Target: " + "lat: " + lat + "  lon: " + lon);

		lat = Math.max(-35, Math.min(45, lat));
		phi = THREE.Math.degToRad(90 - lat);
		theta = THREE.Math.degToRad(lon);
		camera.target.x = 195 * Math.sin(phi) * Math.cos(theta);
		camera.target.y = 195 * Math.cos(phi);
		camera.target.z = 195 * Math.sin(phi) * Math.sin(theta);
		camera.lookAt(camera.target);
		//**console logs: x, y, z coordinates for positioning of hotspots and transitions **
		//console.log("Positions [posX, posY, posZ]" + vectorToString(camera.target));
		//console.log("-----------------------------");
		renderer.render(scene, camera);

		let viewPort= _("mapCamera");
		// 카메라 회전 각도 적용 (viewportDiv 회전)
		if (viewPort) {
			const cameraRotation = camera.rotation.y; // 카메라의 Y축 회전 각도
			//viewPort.style.transform = `rotate(${THREE.MathUtils.radToDeg(cameraRotation)}deg)`;
			viewPort.style.transform = `rotate(${lon}deg)`;

			// console.log("카메라 회전 각도:", THREE.MathUtils.radToDeg(cameraRotation), lon)
		}} else {
		setMapandNavigationHidden(true);
		composer.render();
	}
}

/**
 * Resets Panorama to start location.
 */
function resetPanorama() {
	lastPanoramaUID = -1;
	transitToLocation(panoramaData.startLocation, true);
}


/**
 * Sets up dark blur shader for hotspots.
 */
function setupDarkBlurShader() {
	composer = new THREE.EffectComposer(renderer);
	var renderPass = new THREE.RenderPass(scene, camera);
	composer.addPass(renderPass);

	var blurShader = new THREE.ShaderPass(THREE.BlurShader);
	blurShader.uniforms["h"].value = 1.0 / window.innerWidth;
	blurShader.uniforms["v"].value = 1.0 / window.innerHeight;
	blurShader.uniforms["strength"].value = 0.2;
	blurShader.renderToScreen = true;

	composer.addPass(blurShader);
}

/**
 * Sets up bright blur shader for transitions.
 */
function setupBrightBlurShader() {
	transitionComposer = new THREE.EffectComposer(renderer);
	var renderPass = new THREE.RenderPass(scene, camera);
	transitionComposer.addPass(renderPass);

	var blurShader = new THREE.ShaderPass(THREE.BlurShader);
	blurShader.uniforms["h"].value = 1.0 / window.innerWidth;
	blurShader.uniforms["v"].value = 1.0 / window.innerHeight;
	blurShader.uniforms["strength"].value = 0.5;
	blurShader.renderToScreen = true;

	transitionComposer.addPass(blurShader);
}

//------------------- helper functions------------------------------

/**
 * Helper for getting dom element via id
 * @param id id of dom element
 * @returns {HTMLElement} dom element
 */
function _(id) {
	return document.getElementById(id);
}

/**
 * Helper for pretty print vectors
 * @param v 3d vector to print
 * @returns {string} vector as string in form [x, y, z]
 */
function vectorToString(v) {
	return "[ " + v.x + ", " + v.y + ", " + v.z + " ]";
}




