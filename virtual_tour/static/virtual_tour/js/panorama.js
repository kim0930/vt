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
var lastMouseX = 0;  // 마지막 마우스 X 위치
var lastMouseY = 0;  // 마지막 마우스 Y 위치
var mouseDownTime = 0;  // 마우스를 누른 시간
var mouseDownX = 0;  // 마우스를 누른 X 위치
var mouseDownY = 0;  // 마우스를 누른 Y 위치
var depthMap = null;  // depth map 이미지
var depthData = null;  // depth map 데이터

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
let currentMeasurementStartIndex = 0; // 현재 측정 시작 인덱스 추가

// 측정 관련 변수들을 배열로 수정
let points3D = [];
let measurementLines3D = []; // THREE.Line 객체들의 배열
let measurementLabels = [];
let measureGuide = null;
let pointIndicator = null;
let measurementPoints3D = []; // 3D 공간의 점들의 배열

// 키보드 제어를 위한 변수
var keyboardControls = {
    37: false, // left arrow
    38: false, // up arrow
    39: false, // right arrow
    40: false  // down arrow
};

let isPointSelectionEnabled = false; // 점 선택 활성화 상태를 추적하는 새로운 변수

// 날짜별 측정 데이터를 저장할 객체 추가
let datesMeasurementData = {};

// 위치(파노라마)별 측정 데이터를 저장할 객체 추가
let locationsMeasurementData = {};

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
	// 카메라 움직임 계수 초기화
	lonFactor = 0;
	latFactor = 0;
	
	// 이전 애니메이션 취소
	if (animationId) {
		cancelAnimationFrame(animationId);
		animationId = null;
	}
	
	target_dataURL = find_dataURL(renderedDateStr)
	target_dataURL = datesJsonUrl + target_dataURL
	console.log("날짜 변경:", renderedDateStr);
	
	// 로딩 화면 표시
	var loadingScreen = document.getElementById('loadingScreen');
	
	// 진행 상태 표시줄 초기화 및 애니메이션 설정을 위한 변수
	var progressInterval;
	
	if (loadingScreen) {
		// 기존 로딩 화면이 있으면 표시하고 프로그레스 바 초기화
		loadingScreen.style.display = 'flex';
		
		// 프로그레스 바 초기화
		var progressBar = document.getElementById('loadingProgressBar');
		if (progressBar) {
			progressBar.style.width = '0%';
			
			// 기존 인터벌 제거
			if (window.loadingProgressInterval) {
				clearInterval(window.loadingProgressInterval);
			}
			
			// 새로운 진행 상태 애니메이션 시작
			var progress = 0;
			window.loadingProgressInterval = setInterval(function() {
				progress += 5;
				if (progress > 90) {
					clearInterval(window.loadingProgressInterval);
				}
				progressBar.style.width = progress + '%';
			}, 50);
		}
	} else {
		// 로딩 화면 요소가 없으면 생성
		loadingScreen = document.createElement('div');
		loadingScreen.id = 'loadingScreen';
		loadingScreen.style.position = 'fixed';
		loadingScreen.style.top = '0';
		loadingScreen.style.left = '0';
		loadingScreen.style.width = '100%';
		loadingScreen.style.height = '100%';
		loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
		loadingScreen.style.display = 'flex';
		loadingScreen.style.flexDirection = 'column';
		loadingScreen.style.justifyContent = 'center';
		loadingScreen.style.alignItems = 'center';
		loadingScreen.style.zIndex = '9999';
		
		// 로딩 스피너 컨테이너
		var spinnerContainer = document.createElement('div');
		spinnerContainer.style.position = 'relative';
		spinnerContainer.style.width = '80px';
		spinnerContainer.style.height = '80px';
		spinnerContainer.style.marginBottom = '20px';
		
		// 로딩 스피너 (회전하는 원)
		var spinner = document.createElement('div');
		spinner.style.border = '4px solid rgba(255, 255, 255, 0.3)';
		spinner.style.borderTop = '4px solid #ffffff';
		spinner.style.borderRadius = '50%';
		spinner.style.width = '100%';
		spinner.style.height = '100%';
		spinner.style.animation = 'spin 1s linear infinite';
		
		// 애니메이션 키프레임 추가
		var style = document.createElement('style');
		style.innerHTML = `
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
			@keyframes fadeIn {
				0% { opacity: 0; }
				100% { opacity: 1; }
			}
		`;
		document.head.appendChild(style);
		
		// 로딩 텍스트
		var loadingText = document.createElement('div');
		loadingText.textContent = 'LOADING';
		loadingText.style.color = 'white';
		loadingText.style.fontSize = '18px';
		loadingText.style.fontFamily = 'Arial, sans-serif';
		loadingText.style.fontWeight = 'bold';
		loadingText.style.letterSpacing = '3px';
		loadingText.style.animation = 'fadeIn 1s ease-in-out infinite alternate';
		
		// 진행 상태 표시줄 컨테이너
		var progressContainer = document.createElement('div');
		progressContainer.style.width = '200px';
		progressContainer.style.height = '4px';
		progressContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
		progressContainer.style.borderRadius = '2px';
		progressContainer.style.marginTop = '15px';
		
		// 진행 상태 표시줄
		var progressBar = document.createElement('div');
		progressBar.id = 'loadingProgressBar';
		progressBar.style.width = '0%';
		progressBar.style.height = '100%';
		progressBar.style.backgroundColor = '#ffffff';
		progressBar.style.borderRadius = '2px';
		progressBar.style.transition = 'width 0.3s ease-in-out';
		
		// 요소들 조합
		spinnerContainer.appendChild(spinner);
		progressContainer.appendChild(progressBar);
		loadingScreen.appendChild(spinnerContainer);
		loadingScreen.appendChild(loadingText);
		loadingScreen.appendChild(progressContainer);
		document.body.appendChild(loadingScreen);
		
		// 진행 상태 애니메이션
		var progress = 0;
		// 기존 인터벌 제거
		if (window.loadingProgressInterval) {
			clearInterval(window.loadingProgressInterval);
		}
		
		// 새로운 진행 상태 애니메이션 시작
		window.loadingProgressInterval = setInterval(function() {
			progress += 5;
			if (progress > 90) {
				clearInterval(window.loadingProgressInterval);
			}
			progressBar.style.width = progress + '%';
		}, 50);
	}
	
	// 날짜가 변경되면 현재 측정 데이터 저장 
	if (selectedDateStr && projectId && selectedDateStr !== renderedDateStr) {
		console.log(`날짜 변경 감지: ${selectedDateStr} -> ${renderedDateStr}`);
		// 현재 날짜의 측정 데이터 저장
		saveMeasurementsForCurrentDate();
		
		// 현재 위치의 측정 데이터 저장
		if (lastPanoramaUID !== undefined && lastPanoramaUID !== -1) {
			saveMeasurementsForCurrentLocation();
		}
	}
	
	selectedDate = new Date(renderedDateStr)
	copiedDate = new Date(selectedDateStr)	

	resolution = res;
	setMapandNavigationHidden(true);
	isLoading = true;
	
	// 새로운 날짜로 선택 변경
	selectedDateStr = renderedDateStr;
	
	parseConfigJSON(target_dataURL, function (panodata) {
		var loader = new LocationLoader();
		loader.loadLocation(panodata.startLocation, function(location) {
			// 로딩 완료 시 프로그레스 바 100%로 설정
			var progressBar = document.getElementById('loadingProgressBar');
			if (progressBar) {
				// 기존 인터벌 제거
				if (window.loadingProgressInterval) {
					clearInterval(window.loadingProgressInterval);
				}
				progressBar.style.width = '100%';
			}
			
			// 0.5초 후에 로딩 화면 숨기기 
			setTimeout(function() {
				if (loadingScreen) {
					loadingScreen.style.display = 'none';
				}
				startComplete(location);
				
				// scene이 초기화된 후에 측정 데이터 로드
				if (datesMeasurementData[selectedDateStr]) {
					console.log(`Loading measurement data for date: ${selectedDateStr}`);
					loadMeasurementsForDate(selectedDateStr);
				} else {
					console.log(`No measurement data found for date: ${selectedDateStr}`);
					clearMeasurementLines();
				}
				
				// 날짜가 변경되면 새 위치에 대한 측정 데이터 로드
				if (lastPanoramaUID !== undefined && lastPanoramaUID !== -1) {
					console.log(`Loading measurement data for location: ${lastPanoramaUID}`);
					
					// 새 위치에 대한 측정 데이터 로드
					const locationKey = `${selectedDateStr}_${lastPanoramaUID}`;
					if (locationsMeasurementData[locationKey]) {
						loadMeasurementsForLocation(lastPanoramaUID);
					}
				}
			}, 500);
		});
	});
	
	// 애니메이션 시작
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
    // 타임스탬프만 URL에 추가
    var nocacheURL = dataURL + (dataURL.includes('?') ? '&' : '?') + 'v=' + new Date().getTime();
    
	var request = new XMLHttpRequest();
    request.open("GET", nocacheURL, true);
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
	// 기존 측정 데이터 불러오기 (localStorage에서)
	try {
		// 날짜별 측정 데이터 불러오기
		const savedDateData = localStorage.getItem('vtMeasurements_' + projectId);
		if (savedDateData) {
			datesMeasurementData = JSON.parse(savedDateData);
			console.log("Loaded date measurements from localStorage");
		}
		
		// 위치별 측정 데이터 불러오기
		const savedLocationData = localStorage.getItem('vtLocationMeasurements_' + projectId);
		if (savedLocationData) {
			locationsMeasurementData = JSON.parse(savedLocationData);
			console.log("Loaded location measurements from localStorage");
		}
	} catch (e) {
		console.warn('Failed to load measurements from localStorage:', e);
	}
	
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
	initMeasurementUI();
	initEventListener();
	calendar = new Calendar();
	
	// 키보드 이벤트 리스너 직접 등록
	setupKeyboardControls();
	
	window.onkeydown = function(e) {
		var key = e.keyCode || e.which;
		if (key === 37 || key === 38 || key === 39 || key === 40) {
			keyboardControls[key] = true;
			updateKeyboardMovement();
			e.preventDefault();
			console.log("키 다운:", key, keyboardControls);
		}
	};
	
	window.onkeyup = function(e) {
		var key = e.keyCode || e.which;
		if (key === 37 || key === 38 || key === 39 || key === 40) {
			keyboardControls[key] = false;
			updateKeyboardMovement();
			e.preventDefault();
			console.log("키 업:", key, keyboardControls);
		}
	};
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

	// depth map 로드
	console.log("Location depthMap:", location.depthMap);
	console.log("Current resolution:", resolution);
	if (location.depthMap && location.depthMap[resolution]) {
		console.log("Loading depth map from:", location.depthMap[resolution]);
		loadDepthMap(location.depthMap[resolution]);
	} else {
		console.log("No depth map available for current resolution");
	}

	// 초기 위치의 측정 데이터 로드
	loadMeasurementsForLocation(location.uid);

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
	// 카메라 움직임 계수 초기화
	lonFactor = 0;
	latFactor = 0;
	
	// 현재 위치의 측정 데이터 저장
	if (lastPanoramaUID !== undefined && lastPanoramaUID !== -1) {
		// 위치별 측정 데이터 저장
		saveMeasurementsForCurrentLocation();
		
		// 현재 날짜의 측정 데이터 저장
		if (selectedDateStr && projectId) {
			saveMeasurementsForCurrentDate();
		}
	}
	
	if (reset) {
		lastPanoramaUID = -1;
	}
	if (locationIndex === lastPanoramaUID) {
		return;
	}
	isLoading = true;

	setMapandNavigationHidden(true);

	setTimeout(function () {
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

			// 이전 위치 저장
			const previousLocationId = lastPanoramaUID;
			
			// 현재 위치 업데이트
			lastPanoramaUID = location.uid;
			mapUid = location.mapUid;
			
			// 새 위치에 대한 측정 데이터 로드
			if (selectedDateStr && projectId && lastPanoramaUID !== undefined) {
				loadMeasurementsForLocation(lastPanoramaUID);
			}
			
			updateSceneSwitchButton();
			updateTargetList();
			setupDarkBlurShader();
			setupBrightBlurShader();
			isLoading = false;
			setMapandNavigationHidden(false);
			camera.fov = 60;
			camera.updateProjectionMatrix();

			// depth map 로드
			if (location.depthMap && location.depthMap[resolution]) {
				loadDepthMap(location.depthMap[resolution]);
			}
			
			// 새 위치의 측정 데이터 로드
			loadMeasurementsForLocation(location.uid);
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
	container.addEventListener('mouseout', onMouseOut, false);

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
	var mapContainer = _("mapContainer");
	
	// 전역 변수로 리사이징 상태 관리
	window.isResizing = false;
	var startX, startY;
	var startWidth, startHeight;
	
	// resizeHandle에 대한 이벤트 리스너
	resizeHandle.addEventListener("mousedown", function(event) {
		// 이벤트 전파 중지
		event.preventDefault();
		event.stopPropagation();
		
		// 리사이징 시작 상태 설정
		window.isResizing = true;
		isUserInteracting = false; 
		
		// 시작 위치 저장
		startX = event.clientX;
		startY = event.clientY;
		
		// 시작 크기 저장
		var rect = mapContainer.getBoundingClientRect();
		startWidth = rect.width;
		startHeight = rect.height;
		
		console.log("Resize started");
		
		// 마우스 이동 및 마우스 업 이벤트를 window에 직접 등록
		window.addEventListener("mousemove", handleResizeMove);
		window.addEventListener("mouseup", handleResizeEnd);
	});
	
	// 리사이징 중 마우스 이동 처리 함수
	function handleResizeMove(event) {
		// 이벤트 전파 중지
		event.preventDefault();
		event.stopPropagation();
		
		if (!isMapMinimized) {
			// 마우스 이동 거리 계산
			var deltaX = event.clientX - startX;
			
			// 새 크기 계산
			var newWidth = startWidth + deltaX;
			var newHeight = newWidth / aspectRatio;
			
			console.log("Resizing:", newWidth, newHeight);
			
			// 최소 크기 제한
			if (newWidth > 100 && newHeight > 50) {
				// 맵 컨테이너 크기 업데이트
				mapContainer.style.width = newWidth + "px";
				mapContainer.style.height = newHeight + "px";
				
				// 관련 요소 위치 업데이트
				updateSpotPositions(newWidth, newHeight);
				updateResizeHandlePosition();
				updateToggleButtonPosition();
			}
		}
	}
	
	// 리사이징 종료 처리 함수
	function handleResizeEnd(event) {
		// 이벤트 전파 중지
		event.preventDefault();
		event.stopPropagation();
		
		// 리사이징 종료
		window.isResizing = false;
		console.log("Resize ended");
		
		// 이벤트 리스너 제거
		window.removeEventListener("mousemove", handleResizeMove);
		window.removeEventListener("mouseup", handleResizeEnd);
	}
	
	// document의 기존 mousemove 이벤트 리스너 제거
	document.removeEventListener("mousemove", function(event) {
		if (window.isResizing && !isMapMinimized) {
			// 이벤트 전파 중지
			event.preventDefault();
			event.stopPropagation();
			
			// 마우스 이동 거리 계산
			var deltaX = event.clientX - startX;
			
			// 새 크기 계산
			var newWidth = startWidth + deltaX;
			var newHeight = newWidth / aspectRatio;
			
			console.log("Resizing:", newWidth, newHeight);
			
			// 최소 크기 제한
			if (newWidth > 100 && newHeight > 50) {
				// 맵 컨테이너 크기 업데이트
				mapContainer.style.width = newWidth + "px";
				mapContainer.style.height = newHeight + "px";
				
				// 관련 요소 위치 업데이트
				updateSpotPositions(newWidth, newHeight);
				updateResizeHandlePosition();
				updateToggleButtonPosition();
			}
		}
	});
	
	// document의 기존 mouseup 이벤트 리스너 제거
	document.removeEventListener("mouseup", function(event) {
		if (window.isResizing) {
			// 이벤트 전파 중지
			event.preventDefault();
			event.stopPropagation();
			
			// 리사이징 종료
			window.isResizing = false;
			console.log("Resize ended");
		}
	});

	// 치수 측정 모드
	var measureModeBtn = _("measureModeBtn");
	measureModeBtn.addEventListener("click", function (event){
		startMeasureMode();
		event.preventDefault();
	});

	// 치수 측정 모드 종료 
	var measureModeExitBtn = _("measureModeExitBtn");
	measureModeExitBtn.addEventListener('click', function (event){
		exitMeasureMode();
		event.preventDefault();
	});

	// 키보드 이벤트 리스너 등록 (추가 백업)
	setupKeyboardControls();
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
	/**
	 * 항상 숨기게 설정함.
	 */
	if (navButtons) navButtons.style.display = 'none';
	if (about) about.style.display = 'none';
	if (sceneSwitch) sceneSwitch.style.display = 'none';
	/**
	 * 항상 숨기게 설정함.
	 */


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
	isUserInteracting = false;
	lonFactor = 0;
	latFactor = 0;
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
	isUserInteracting = false;
	lonFactor = 0;
	latFactor = 0;
}

/**
 * Handler for move Event inputs.
 * @param eventX x-Value of event
 * @param eventY y-Value of event
 * @param event input event
 */
function moveEventHandler(eventX, eventY, event) { 
    // 이벤트 기본 동작 방지
    event.preventDefault();
    
    // 드래그 중인 경우
    if (isUserInteracting === true && event.buttons > 0 && 
        !keyboardControls[37] && !keyboardControls[38] && 
        !keyboardControls[39] && !keyboardControls[40]) {
        var deltaX = eventX - lastMouseX;
        var deltaY = eventY - lastMouseY;
        
        lonFactor = -deltaX * 0.2;
        latFactor = deltaY * 0.2;
        
        lastMouseX = eventX;
        lastMouseY = eventY;
       
        return;
    }

    // 드래그 중이 아닐 때만 실행
    if (!event.buttons) {
        try {
            // 마우스 좌표를 정규화된 좌표로 변환 (-1 ~ 1)
            const normalizedX = (eventX / window.innerWidth) * 2 - 1;
            const normalizedY = -(eventY / window.innerHeight) * 2 + 1;
            
            // update the mouse variable
            mouse.x = normalizedX;
            mouse.y = normalizedY;

            // find intersections
            var vector = new THREE.Vector3(mouse.x, mouse.y, 0);
            vector.unproject(camera);

            var ray = new THREE.Raycaster();
            ray.set(camera.position, vector.sub(camera.position).normalize());

            var intersects = ray.intersectObjects(targetList, true);

            if (intersects.length > 0) {
                if (intersects[0].object !== hoverIntersected) {
                    if (hoverIntersected) {
                        hoverIntersected.material.color.setHex(hoverIntersected.currentHex);
                    }
                    hoverIntersected = intersects[0].object;

                    hoverIntersected.currentHex = hoverIntersected.material.color.getHex();
                    hoverIntersected.material.color.setHex(0x917d4d);

                    if (intersects[0].object.tooltip) {
                        toolTip.innerHTML = intersects[0].object.tooltip;
                        toolTip.style.display = "block";
                    }
                }
            } else {
                if (hoverIntersected) {
                    hoverIntersected.material.color.setHex(hoverIntersected.currentHex);
                }
                hoverIntersected = null;
                
                // Transition 객체에 마우스가 없을 때만 깊이 정보 표시
                if (!isMeasureMode) {
                    showDepthInfo(normalizedX, normalizedY);
                }
            }
        } catch (error) {
            console.warn('Error in moveEventHandler:', error);
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
    if (window.isResizing) {
        return;
    }

    if (isPopupOpen) {
        return;
    }

    // 마우스 위치와 시간 저장
    lastMouseX = eventX;
    lastMouseY = eventY;
    mouseDownTime = Date.now();
    mouseDownX = eventX;
    mouseDownY = eventY;
    
    // 측정 라인 클릭 확인 - 점 선택 모드가 아닐 때만 삭제 가능
    if (isMeasureMode && !isPointSelectionEnabled) {
        // 마우스 위치를 정규화된 좌표로 변환 (-1 ~ 1)
        const normalizedX = (eventX / window.innerWidth) * 2 - 1;
        const normalizedY = -(eventY / window.innerHeight) * 2 + 1;
        
        // 레이캐스터 생성 및 설정
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), camera);
        
        // 측정 라인과 레이블 배열 생성
        const measurementObjects = [...measurementLines3D, ...measurementLabels];
        
        // 레이캐스팅으로 클릭된 객체 확인
        const intersects = raycaster.intersectObjects(measurementObjects, true);
        
        if (intersects.length > 0) {
            // 클릭된 객체의 ID 가져오기
            const clickedObject = intersects[0].object;
            if (clickedObject.userData && (clickedObject.userData.type === 'measurementLine' || clickedObject.userData.type === 'measurementLabel')) {
                const measurementId = clickedObject.userData.id;
                
                // 해당 측정 라인 삭제
                removeMeasurementLine(measurementId);
                
                // 이벤트 처리 완료
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        }
    }

    // 항상 드래그를 위한 상호작용 활성화 (카메라 이동 가능하도록)
    isUserInteracting = true;
    onPointerDownPointerX = eventX;
    onPointerDownPointerY = eventY;
    onPointerDownLon = lon;
    onPointerDownLat = lat;

    // 측정 모드이지만 점 선택이 활성화되지 않은 경우, 일반 상호작용 방지
    if (isMeasureMode && !isPointSelectionEnabled) {
        // + 아이콘을 클릭하지 않은 상태에서는 카메라 이동만 가능하도록
        if (event.target.id !== 'measureControl' && 
            event.target.id !== 'confirmMeasure' && 
            event.target.id !== 'clearMeasure' &&
            event.target.id !== 'measureModeBtn' &&
            !event.target.classList.contains('measure-control-btn')) {
            return;
        }
    }

    // 클릭한 객체 확인 (Transition, Hotspot 등)
    event.preventDefault();

    // update the mouse variable
    mouse.x = (eventX / window.innerWidth) * 2 - 1;
    mouse.y = -(eventY / window.innerHeight) * 2 + 1;

    // find intersections
    var vector = new THREE.Vector3(mouse.x, mouse.y, 0);
    vector.unproject(camera);

    var ray = new THREE.Raycaster();
    ray.set(camera.position, vector.sub(camera.position).normalize());

    // create an array containing all objects in the scene with which the ray intersects
    var intersects = ray.intersectObjects(targetList, true);

    // if there is one (or more) intersections
    if (intersects.length > 0) {
        intersects[0].object.onClick();
        if (intersects[0].object instanceof Hotspot) {
            isPopupOpen = true;
        }
    } else {
        isUserInteracting = true;
    }
    toolTip.style.display = "none";
}


/**
 * Handler for ending input events.
 * @param event not used
 */
function upEventHandler(event) {
    if (window.isResizing) {
        return;
    }
    
    // 키보드로 제어 중이 아닐 때만 마우스 상호작용 종료
    if (!keyboardControls[37] && !keyboardControls[38] && 
        !keyboardControls[39] && !keyboardControls[40]) {
	lonFactor = 0;
	latFactor = 0;
	isUserInteracting = false;

        // 측정 모드에서 클릭 처리 - 점 선택이 활성화된 경우에만 처리
        if (isMeasureMode && isPointSelectionEnabled) {
            const currentTime = Date.now();
            const timeDiff = currentTime - mouseDownTime;
            const distanceX = Math.abs(event.pageX - mouseDownX);
            const distanceY = Math.abs(event.pageY - mouseDownY);
            
            // 짧은 클릭으로 간주 (300ms 이내, 이동 거리 5px 이내)
            if (timeDiff < 300 && distanceX < 5 && distanceY < 5) {
                // 화면 좌표를 정규화된 좌표로 변환 (-1 ~ 1)
                const normalizedX = (event.pageX / window.innerWidth) * 2 - 1;
                const normalizedY = -(event.pageY / window.innerHeight) * 2 + 1;
                
                // 3D 벡터 생성
                const vector = new THREE.Vector3(normalizedX, normalizedY, 0.5);
                
                // 카메라의 투영 행렬을 사용하여 3D 공간의 점으로 변환
                vector.unproject(camera);
                
                // 구면 위로 투영
                const direction = vector.sub(camera.position).normalize();
                const spherePoint = direction.multiplyScalar(195);
                
                // 새 점 추가 (3D 좌표와 화면 좌표 모두 저장)
                const newPoint = {
                    x: event.pageX,
                    y: event.pageY,
                    normalizedX: event.pageX / window.innerWidth,
                    normalizedY: event.pageY / window.innerHeight,
                    vector3D: spherePoint.clone() // 3D 좌표 저장
                };
                
                // 이전 점이 있으면 선 그리기
                if (points3D.length > 0) {
                    const prevPoint = points3D[points3D.length - 1];
                    
                    // 3D 거리 계산 (저장된 3D 벡터 사용)
                    const distance = prevPoint.vector3D.distanceTo(newPoint.vector3D) / 10; // 스케일 조정
                    
                    // 선 그리기 (3D 벡터 사용)
                        draw3DMeasurementLine(prevPoint, newPoint, distance);
                }
                
                // 새 점 저장
                points3D.push(newPoint);
                
                // 점이 2개 이상이면 X 아이콘 숨기기
                if (points3D.length >= 2) {
                    const measureControl = document.getElementById('measureControl');
                    measureControl.style.display = 'none';
                }
            }
        }
    }
}

/**
 * EventListener if mouse wheel events.
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
	// 이전 애니메이션 취소하여 중복 실행 방지
	if (animationId) {
		cancelAnimationFrame(animationId);
	}
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

	// if popUp is not open
	if (!isPopupOpen) {
		// 마우스 드래그가 없는 경우 움직임 계수를 천천히 0으로 줄임
		if (!isUserInteracting) {
			lonFactor *= 0.95; // 점진적으로 감소
			latFactor *= 0.95; // 점진적으로 감소
			
			// 아주 작은 값은 0으로 설정 (부동소수점 계산 오류 방지)
			if (Math.abs(lonFactor) < 0.01) lonFactor = 0;
			if (Math.abs(latFactor) < 0.01) latFactor = 0;
		}
		
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

		// Three.js 스프라이트는 3D 공간에 직접 위치하므로 별도의 업데이트가 필요하지 않음
		// 카메라가 움직여도 스프라이트는 자동으로 올바른 위치에 렌더링됨

		let viewPort= _("mapCamera");
		// 카메라 회전 각도 적용 (viewportDiv 회전)
		if (viewPort) {
			const cameraRotation = camera.rotation.y; // 카메라의 Y축 회전 각도
			//viewPort.style.transform = `rotate(${THREE.MathUtils.radToDeg(cameraRotation)}deg)`;
			viewPort.style.transform = `rotate(${lon}deg)`;

			// console.log("카메라 회전 각도:", THREE.MathUtils.radToDeg(cameraRotation), lon)
        }
    } else {
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

// depth map 로드 함수
function loadDepthMap(depthMapUrl) {
    console.log("Depth map 로딩 시작:", depthMapUrl);
    const img = new Image();
    img.onload = function() {
        console.log("Depth map 이미지 로드 완료:", img.width, "x", img.height);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // depth map 데이터 추출
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        depthData = imageData.data;
        depthMap = img;
        console.log("Depth map 데이터 추출 완료. 데이터 길이:", depthData.length);
        console.log("Depth map 샘플 값:", depthData.slice(0, 4));
    };
    img.onerror = function(error) {
        console.error("Depth map 로딩 실패:", depthMapUrl);
        console.error("에러 정보:", error);
    };
    img.src = depthMapUrl;
}

// 특정 좌표의 깊이값 가져오기
function getDepthAtPoint(x, y) {
    if (!depthData || !depthMap) {
        console.log("Depth map 데이터 없음");
        return null;
    }
    
    // 좌표를 depth map 크기에 맞게 변환
    const mapX = Math.floor(x * depthMap.width);
    const mapY = Math.floor(y * depthMap.height);
    
    // 배열 범위 체크
    if (mapX < 0 || mapX >= depthMap.width || mapY < 0 || mapY >= depthMap.height) {
        console.log("좌표가 depth map 범위를 벗어남:", mapX, mapY);
        return null;
    }
    
    // depth map에서 해당 위치의 값 가져오기 (R 채널 사용)
    const index = (mapY * depthMap.width + mapX) * 4;
    return depthData[index];
}

// 깊이 정보 표시 함수
function showDepthInfo(x, y) {
    const depth = getDepthAtPoint(x, y);
    if (depth !== null) {
        console.log(`깊이: ${depth.toFixed(2)}m (좌표: ${x.toFixed(3)}, ${y.toFixed(3)})`);
    }
}

/**
 * 마우스가 화면 밖으로 나갈 때 호출되는 이벤트 핸들러
 * @param event mouse event
 */
function onMouseOut(event) {
    // 마우스가 화면 밖으로 나가면 모든 상호작용 중지
    lonFactor = 0;
    latFactor = 0;
    isUserInteracting = false;
    isResizing = false;
    
    // 마우스 위치 초기화
    lastMouseX = 0;
    lastMouseY = 0;
    
    // 툴크 숨기기
    if (toolTip) {
        toolTip.style.display = "none";
    }
}

/**
 * 키보드 상태에 따라 움직임 요소 업데이트
 */
function updateKeyboardMovement() {
    // 움직임 요소 초기화
    lonFactor = 0;
    latFactor = 0;
    
    // 방향키 상태에 따라 움직임 요소 설정
    if (keyboardControls[37]) lonFactor -= 0.5; // left
    if (keyboardControls[39]) lonFactor += 0.5; // right
    if (keyboardControls[38]) latFactor += 0.5; // up
    if (keyboardControls[40]) latFactor -= 0.5; // down
    
    // 어떤 방향키든 눌려있으면 사용자 상호작용 중
    isUserInteracting = keyboardControls[37] || keyboardControls[38] || 
                        keyboardControls[39] || keyboardControls[40];
}

/**
 * 키보드 컨트롤 설정 함수
 */
function setupKeyboardControls() {
    // 기존 이벤트 리스너 제거 (중복 방지)
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    
    // 새 이벤트 리스너 등록
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    
    // 초기 상태 설정
    for (var key in keyboardControls) {
        keyboardControls[key] = false;
    }
    updateKeyboardMovement();
}

// 페이지 로드 시 직접 키보드 이벤트 리스너 등록 (백업)
document.addEventListener("DOMContentLoaded", function() {
    // 키보드 이벤트 리스너 등록
    setupKeyboardControls();
});

// 키보드 다운 이벤트 처리 함수
function handleKeyDown(e) {
    var key = e.keyCode || e.which;
    
    if (key === 37 || key === 38 || key === 39 || key === 40) {
        keyboardControls[key] = true;
        updateKeyboardMovement();
        e.preventDefault();
    }
}

// 키보드 업 이벤트 처리 함수
function handleKeyUp(e) {
    var key = e.keyCode || e.which;
    
    if (key === 37 || key === 38 || key === 39 || key === 40) {
        keyboardControls[key] = false;
        updateKeyboardMovement();
        e.preventDefault();
    }
}

// 3D 측정 함수들
function calculate3DDistance(point1, point2) {
    const depth1 = getDepthAtPoint(point1.normalizedX, point1.normalizedY);
    const depth2 = getDepthAtPoint(point2.normalizedX, point2.normalizedY);
    
    if (depth1 !== null && depth2 !== null) {
        // 화면 좌표를 3D 공간 좌표로 변환
        const x1 = (point1.normalizedX - 0.5) * 2;
        const y1 = -(point1.normalizedY - 0.5) * 2;
        const x2 = (point2.normalizedX - 0.5) * 2;
        const y2 = -(point2.normalizedY - 0.5) * 2;
        
        // 깊이값을 정규화 (0-255를 0-1로 변환)
        const z1 = depth1 / 255;
        const z2 = depth2 / 255;
        
        // 3D 거리 계산 (단위: 미터로 가정)
        const dx = (x2 - x1) * 10; // 10m 스케일 적용
        const dy = (y2 - y1) * 10;
        const dz = (z2 - z1) * 10;
        
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    return null;
}

// 현재 측정 데이터 저장 함수
function saveMeasurementsForCurrentDate() {
    if (!selectedDateStr || !projectId) {
        console.warn("Cannot save measurements: missing date or project ID");
        return;
    }
    
    console.log(`Saving measurements for date ${selectedDateStr}: ${measurementLines3D.length} lines, ${measurementLabels.length} labels`);
    
    // 현재 날짜의 측정 데이터 수집
    const measurementData = {
        lines: [],
        labels: [],
        points3D: []
    };
    
    try {
        // 측정선 데이터 수집
        measurementLines3D.forEach((line) => {
            if (line && line.geometry && line.geometry.attributes && line.geometry.attributes.position) {
                try {
                    const positions = line.geometry.attributes.position.array;
                    const points = [];
                    for (let i = 0; i < positions.length; i += 3) {
                        points.push({
                            x: positions[i],
                            y: positions[i + 1],
                            z: positions[i + 2]
                        });
                    }
                    
                    measurementData.lines.push({
                        id: line.userData ? line.userData.id : Date.now().toString(),
                        points: points,
                        visible: line.visible
                    });
                } catch (e) {
                    console.error("Error saving line:", e);
                }
            }
        });
        
        // 측정 레이블 데이터 수집
        measurementLabels.forEach((label) => {
            if (label && label.position) {
                try {
                    measurementData.labels.push({
                        id: label.userData ? label.userData.id : Date.now().toString(),
                        position: {
                            x: label.position.x,
                            y: label.position.y,
                            z: label.position.z
                        },
                        text: label.userData && label.userData.text ? label.userData.text : '',
                        visible: label.visible,
                        scale: {
                            x: label.scale.x,
                            y: label.scale.y,
                            z: label.scale.z
                        }
                    });
                } catch (e) {
                    console.error("Error saving label:", e);
                }
            }
        });
        
        // 측정 포인트 데이터 수집
        measurementPoints3D.forEach((point) => {
            if (point && point.points && Array.isArray(point.points)) {
                try {
                    const pointData = {
                        id: point.id || Date.now().toString(),
                        points: point.points.map(p => ({ 
                            x: p.x, 
                            y: p.y, 
                            z: p.z 
                        }))
                    };
                    measurementData.points3D.push(pointData);
                } catch (e) {
                    console.error("Error saving point:", e);
                }
            }
        });
        
        // 현재 날짜에 데이터 저장
        datesMeasurementData[selectedDateStr] = measurementData;
        
        // localStorage에 저장 (선택 사항)
        try {
            localStorage.setItem('vtMeasurements_' + projectId, JSON.stringify(datesMeasurementData));
            console.log("Measurements saved to localStorage");
        } catch (e) {
            console.warn('Failed to save measurements to localStorage:', e);
        }
    } catch (e) {
        console.error("Error in saveMeasurementsForCurrentDate:", e);
    }
}

// 특정 날짜의 측정 데이터 로드 함수
function loadMeasurementsForDate(dateStr) {
    // 먼저 현재 측정 데이터 정리
    clearMeasurementLines();
    
    // 해당 날짜의 측정 데이터가 없으면 종료
    if (!datesMeasurementData[dateStr]) return;
    
    const data = datesMeasurementData[dateStr];
    
    // 측정선 복원
    data.lines.forEach((lineData) => {
        if (lineData.points && lineData.points.length >= 2) {
            try {
                // 첫 번째와 두 번째 점으로 선 생성
                const point1 = {
                    vector3D: new THREE.Vector3(
                        lineData.points[0].x,
                        lineData.points[0].y,
                        lineData.points[0].z
                    )
                };
                
                const point2 = {
                    vector3D: new THREE.Vector3(
                        lineData.points[1].x,
                        lineData.points[1].y,
                        lineData.points[1].z
                    )
                };
                
                // 두 점 사이의 거리 계산
                const distance = point1.vector3D.distanceTo(point2.vector3D) / 10;
                
                // 측정선 그리기
                const line = createMeasurementLine(point1, point2, distance, lineData.id);
                
                // 현재 측정 모드 상태에 따라 가시성 설정
                line.visible = isMeasureMode;
            } catch (e) {
                console.error("Error restoring measurement line:", e);
            }
        }
    });
    
    // 측정 포인트 데이터 복원
    if (data.points3D && Array.isArray(data.points3D)) {
        data.points3D.forEach((pointData) => {
            if (pointData.points && Array.isArray(pointData.points)) {
                try {
                    const pointsVector3 = pointData.points.map(p => 
                        new THREE.Vector3(p.x, p.y, p.z)
                    );
                    
                    measurementPoints3D.push({
                        id: pointData.id,
                        points: pointsVector3
                    });
                } catch (e) {
                    console.error("Error restoring measurement points:", e);
                }
            }
        });
    }
    
    console.log(`Loaded measurements for date ${dateStr}: ${measurementLines3D.length} lines, ${measurementLabels.length} labels`);
}

// 측정선 생성 함수 (기존 draw3DMeasurementLine 함수와 내부 로직 동일하나, ID를 받을 수 있도록 수정)
function createMeasurementLine(point1, point2, distance, id = null) {
    // 고유 ID 생성 또는 사용
    const measurementId = id || Date.now().toString();
    
    // 3D 공간에서의 점 좌표 사용
    const vector1 = point1.vector3D.clone();
    const vector2 = point2.vector3D.clone();
    
    // 선 생성을 위한 geometry
    const geometry = new THREE.BufferGeometry().setFromPoints([vector1, vector2]);
    
    // 거리에 따른 선 굵기 계산 (거리가 가까울수록 굵게)
    // 최대 거리를 20m로 가정하고, 최소 굵기 3, 최대 굵기 12로 설정
    const maxDistance = 20; // 최대 거리 (m)
    const minWidth = 3; // 최소 굵기 (2 -> 3)
    const maxWidth = 12; // 최대 굵기 (8 -> 12)
    
    // 거리에 따른 선 굵기 계산 (거리가 가까울수록 굵게)
    const lineWidth = Math.max(minWidth, maxWidth - (distance / maxDistance) * (maxWidth - minWidth));
    
    // 선 material 생성 (불투명한 흰색, 거리에 따른 굵기)
    const material = new THREE.LineBasicMaterial({ 
        color: 0xffffff, // 흰색
        linewidth: lineWidth,
        opacity: 0.9, // 약간의 투명도
        transparent: true,
        depthTest: false // 항상 다른 객체 위에 그려지도록
    });
    
    // 새로운 선 생성 및 장면에 추가
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 999; // 선도 마지막에 렌더링되도록 설정
    line.userData = { type: 'measurementLine', id: measurementId }; // 식별자 추가
    line.visible = isMeasureMode; // 측정 모드일 때만 보이도록 설정
    scene.add(line);
    measurementLines3D.push(line);
    
    // 3D 공간에서 선의 중점 계산
    const midPoint = new THREE.Vector3().addVectors(vector1, vector2).multiplyScalar(0.5);
    
    // Three.js를 사용하여 3D 공간에 거리 레이블 생성
    const distanceText = `${distance.toFixed(2)}m`;
    
    // 캔버스에 텍스트 그리기
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 36; // 글씨 크기 키움 (24 -> 36)
    context.font = `bold ${fontSize}px Arial`;
    
    // 텍스트 크기 측정
    const textWidth = context.measureText(distanceText).width;
    const textHeight = fontSize;
    
    // 캔버스 크기 설정 (패딩 추가)
    const padding = 12; // 패딩도 키움 (8 -> 12)
    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;
    
    // 둥근 모서리 배경 그리기
    const cornerRadius = 8; // 모서리 반경
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.beginPath();
    context.moveTo(cornerRadius, 0);
    context.lineTo(canvas.width - cornerRadius, 0);
    context.quadraticCurveTo(canvas.width, 0, canvas.width, cornerRadius);
    context.lineTo(canvas.width, canvas.height - cornerRadius);
    context.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cornerRadius, canvas.height);
    context.lineTo(cornerRadius, canvas.height);
    context.quadraticCurveTo(0, canvas.height, 0, canvas.height - cornerRadius);
    context.lineTo(0, cornerRadius);
    context.quadraticCurveTo(0, 0, cornerRadius, 0);
    context.closePath();
    context.fill();
    
    // 둥근 모서리 테두리 추가
    context.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    context.lineWidth = 2;
    context.stroke();
    
    // 텍스트 그리기
    context.font = `bold ${fontSize}px Arial`;
    context.fillStyle = '#333';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(distanceText, canvas.width / 2, canvas.height / 2);
    
    // 텍스처 생성
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // 스프라이트 머티리얼 생성
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
    });
    
    // 스프라이트 생성
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.renderOrder = 1000; // 렌더링 순서 설정
    sprite.userData = { 
        type: 'measurementLabel', 
        id: measurementId,
        text: distanceText
    }; // 식별자와 텍스트 추가
    sprite.visible = isMeasureMode; // 측정 모드일 때만 보이도록 설정
    
    // 스프라이트 크기 설정 (텍스트 크기에 비례)
    const scale = 0.08; // 스케일 값 증가 (0.05 -> 0.08)
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
    
    // 스프라이트 위치 설정 (선의 중점)
    sprite.position.copy(midPoint);
    
    // 스프라이트를 장면에 추가
    scene.add(sprite);
    
    // 레이블 저장 (HTML 레이블 대신 Three.js 스프라이트 저장)
    measurementLabels.push(sprite);
    
    // 3D 점들과 중점 저장
    measurementPoints3D.push({
        points: [vector1, vector2, midPoint],
        id: measurementId
    });
    
    return line;
}

// 기존 draw3DMeasurementLine 함수 수정 - createMeasurementLine 호출로 대체
function draw3DMeasurementLine(point1, point2, distance) {
    const line = createMeasurementLine(point1, point2, distance);
    
    // 측정선이 그려진 후 컨트롤 그룹 표시
    const measureControl = document.getElementById('measureControl');
    const measureControlGroup = document.querySelector('.measure-control-group');
    
    // 점이 2개 이상이면 X 아이콘 숨기고 컨트롤 그룹 표시
    measureControl.style.display = 'none';
    measureControlGroup.classList.add('active');
    
    return line;
}

// 특정 ID의 측정 라인 삭제
function removeMeasurementLine(measurementId) {
    console.log(`Removing measurement line with ID: ${measurementId}`);
    
    // 라인 찾기 및 삭제
    const lineIndex = measurementLines3D.findIndex(line => line.userData.id === measurementId);
    if (lineIndex !== -1) {
        const line = measurementLines3D[lineIndex];
        scene.remove(line);
        if (line.geometry) line.geometry.dispose();
        if (line.material) line.material.dispose();
        measurementLines3D.splice(lineIndex, 1);
        console.log(`Removed line at index ${lineIndex}`);
    } else {
        console.log(`Line with ID ${measurementId} not found in measurementLines3D`);
    }
    
    // 레이블 찾기 및 삭제
    const labelIndex = measurementLabels.findIndex(label => label.userData.id === measurementId);
    if (labelIndex !== -1) {
        const label = measurementLabels[labelIndex];
        scene.remove(label);
        if (label.material && label.material.map) {
            label.material.map.dispose();
            label.material.dispose();
        }
        measurementLabels.splice(labelIndex, 1);
        console.log(`Removed label at index ${labelIndex}`);
    } else {
        console.log(`Label with ID ${measurementId} not found in measurementLabels`);
    }
    
    // 점 데이터 삭제
    const pointIndex = measurementPoints3D.findIndex(point => point.id === measurementId);
    if (pointIndex !== -1) {
        measurementPoints3D.splice(pointIndex, 1);
        console.log(`Removed point data at index ${pointIndex}`);
    } else {
        console.log(`Point with ID ${measurementId} not found in measurementPoints3D`);
    }
    
    // 모든 측정이 삭제되었는지 확인
    if (measurementLines3D.length === 0) {
        // 측정 컨트롤 상태 업데이트
        const measureControl = document.getElementById('measureControl');
        const measureControlGroup = document.querySelector('.measure-control-group');
        
        measureControl.style.display = 'block';
        measureControlGroup.classList.remove('active');
    }

    // datesMeasurementData에서도 해당 측정선 삭제
    if (selectedDateStr && datesMeasurementData[selectedDateStr]) {
        const dateData = datesMeasurementData[selectedDateStr];
        
        // 삭제 전 라인 개수 확인
        const lineCountBefore = dateData.lines ? dateData.lines.length : 0;
        
        // 선 삭제
        if (dateData.lines) {
            dateData.lines = dateData.lines.filter(line => line.id !== measurementId);
        }
        
        // 레이블 삭제
        if (dateData.labels) {
            dateData.labels = dateData.labels.filter(label => label.id !== measurementId);
        }
        
        // 점 데이터 삭제
        if (dateData.points3D) {
            dateData.points3D = dateData.points3D.filter(point => point.id !== measurementId);
        }
        
        // 삭제 후 라인 개수 확인
        const lineCountAfter = dateData.lines ? dateData.lines.length : 0;
        console.log(`Removed from datesMeasurementData: ${lineCountBefore - lineCountAfter} lines`);
        
        // 업데이트된 데이터 저장
        datesMeasurementData[selectedDateStr] = dateData;
        
        // localStorage 업데이트
        try {
            localStorage.setItem('vtMeasurements_' + projectId, JSON.stringify(datesMeasurementData));
            console.log("Updated measurements saved to localStorage after deletion");
        } catch (e) {
            console.warn('Failed to update measurements in localStorage:', e);
        }
    } else {
        console.log(`No data found for date ${selectedDateStr} in datesMeasurementData`);
    }
    
    // locationsMeasurementData에서도 해당 측정선 삭제
    if (selectedDateStr && projectId && lastPanoramaUID !== undefined) {
        const locationKey = `${selectedDateStr}_${lastPanoramaUID}`;
        
        if (locationsMeasurementData[locationKey]) {
            const locationData = locationsMeasurementData[locationKey];
            
            // 삭제 전 라인 개수 확인
            const lineCountBefore = locationData.lines ? locationData.lines.length : 0;
            
            // 선 삭제
            if (locationData.lines) {
                locationData.lines = locationData.lines.filter(line => line.id !== measurementId);
            }
            
            // 레이블 삭제
            if (locationData.labels) {
                locationData.labels = locationData.labels.filter(label => label.id !== measurementId);
            }
            
            // 점 데이터 삭제
            if (locationData.points3D) {
                locationData.points3D = locationData.points3D.filter(point => point.id !== measurementId);
            }
            
            // 삭제 후 라인 개수 확인
            const lineCountAfter = locationData.lines ? locationData.lines.length : 0;
            console.log(`Removed from locationsMeasurementData: ${lineCountBefore - lineCountAfter} lines for location ${locationKey}`);
            
            // 업데이트된 데이터 저장
            locationsMeasurementData[locationKey] = locationData;
            
            // localStorage 업데이트
            try {
                localStorage.setItem('vtLocationMeasurements_' + projectId, JSON.stringify(locationsMeasurementData));
                console.log("Updated location measurements saved to localStorage after deletion");
            } catch (e) {
                console.warn('Failed to update location measurements in localStorage:', e);
            }
        } else {
            console.log(`No data found for location ${locationKey} in locationsMeasurementData`);
        }
    } else {
        console.log(`Cannot update locationsMeasurementData: selectedDateStr=${selectedDateStr}, projectId=${projectId}, lastPanoramaUID=${lastPanoramaUID}`);
    }
    
    // 현재 남아있는 측정선 개수 로그
    console.log(`Remaining after deletion: ${measurementLines3D.length} lines, ${measurementLabels.length} labels`);
}

function clearMeasurementLines() {
    // 3D 레이블(스프라이트) 제거
    measurementLabels.forEach(label => {
        if (label && scene) {
            scene.remove(label);
            if (label.material && label.material.map) {
                label.material.map.dispose();
                label.material.dispose();
            }
        }
    });
    
    // 3D 선 제거
    measurementLines3D.forEach(line => {
        if (line && scene) {
            scene.remove(line);
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
        }
    });
    
    // 배열 초기화
    measurementLabels = [];
    measurementLines3D = [];
    measurementPoints3D = [];
    points3D = [];
}

// 측정 모드 종료 시 정리
function exitMeasureMode() {
    isMeasureMode = false;
    isPointSelectionEnabled = false;
    points3D = [];
    const measureControl = document.getElementById('measureControl');
    const measureControlGroup = document.querySelector('.measure-control-group');
    
    measureControl.style.display = 'none';
    measureControlGroup.classList.remove('active');
    pointIndicator.style.display = 'none';
    
    // 측정선과 레이블 숨기기
    measurementLines3D.forEach(line => {
        line.visible = false;
    });
    
    measurementLabels.forEach(label => {
        label.visible = false;
    });
    
    // measureModeBtn 표시
    if (_("measureModeBtn")) _("measureModeBtn").style.display = 'block';
    
    // measureModeExitBtn 숨기기 및 애니메이션 중지
    if (_("measureModeExitBtn")) {
        const exitBtn = _("measureModeExitBtn");
        exitBtn.style.display = 'none';
        exitBtn.style.animation = 'none';
    }
}

// UI 초기화 함수
function initMeasurementUI() {
    // CSS 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
        .measurement-line {
            pointer-events: none;
            z-index: 1000;
        }
        .measurement-label {
            pointer-events: none;
            z-index: 1001;
            font-family: Arial, sans-serif;
        }
        .measure-control {
            position: fixed;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.9);
            color: #333;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            bottom: 80px; /* 바닥에서 20px 더 올림 (기존 20px에서 40px로 변경) */
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
            text-align: center;
            line-height: 40px;
        }
        .measure-control:hover {
            background: rgba(255, 255, 255, 1);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        .measure-control-group {
            position: fixed;
            bottom: 00px; /* 바닥에서 20px 더 올림 (기존 20px에서 40px로 변경) */
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 100px;
            z-index: 1000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }
        .measure-control-group.active {
            opacity: 1;
            pointer-events: auto;
        }
        #confirmMeasure {
            left: calc(50% - 50px); /* 왼쪽으로 50px 이동 */
        }
        #clearMeasure {
            left: calc(50% + 50px); /* 오른쪽으로 50px 이동 */
        }
        .measure-point-indicator {
            position: fixed;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
            background: rgba(255, 255, 255, 0.7);
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 1003;
            box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.2);
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% {
                box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
            }
            70% {
                box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
            }
        }
    `;
    document.head.appendChild(style);

    // 측정 컨트롤 버튼 생성
    const measureControl = document.createElement('div');
    measureControl.className = 'measure-control';
    measureControl.innerHTML = '+';
    measureControl.id = 'measureControl';
    measureControl.style.display = 'none'; // 초기에는 숨김 상태
    measureControl.style.textAlign = 'center'; // 텍스트 중앙 정렬
    document.body.appendChild(measureControl);

    // 측정 컨트롤 그룹 생성
    const measureControlGroup = document.createElement('div');
    measureControlGroup.className = 'measure-control-group';
    measureControlGroup.innerHTML = `
        <div class="measure-control" id="confirmMeasure" style="text-align: center; line-height: 40px;">✓</div>
        <div class="measure-control" id="clearMeasure" style="text-align: center; line-height: 40px;">🗑️</div>
    `;
    document.body.appendChild(measureControlGroup);

    pointIndicator = document.createElement('div');
    pointIndicator.className = 'measure-point-indicator';
    pointIndicator.style.display = 'none';
    document.body.appendChild(pointIndicator);

    // 이벤트 리스너 등록
    measureControl.addEventListener('click', function() {
        if (measureControl.innerHTML === '+') {
            // + 아이콘 클릭 시 점 선택 활성화
            isPointSelectionEnabled = true;
            measureControl.innerHTML = '×'; // X 아이콘으로 변경
            currentMeasurementStartIndex = measurementLines3D.length; // 현재 측정 시작 인덱스 업데이트
            points3D = []; // 점 배열 초기화 - 새로운 측정 시작
        } else if (measureControl.innerHTML === '×') {
            // X 아이콘 클릭 시 측정 취소
            isPointSelectionEnabled = false;
            measureControl.innerHTML = '+'; // + 아이콘으로 변경
            points3D = []; // 선택된 점 초기화
        }
    });

    document.getElementById('confirmMeasure').addEventListener('click', function() {
        // 측정 확인 함수 호출
        confirmMeasurements();
    });

    document.getElementById('clearMeasure').addEventListener('click', function() {
        // 현재 측정선만 삭제
        clearCurrentMeasurements();
        // + 아이콘 다시 표시
        measureControl.style.display = 'block';
        measureControl.innerHTML = '+';
        measureControlGroup.classList.remove('active');
        isPointSelectionEnabled = false;
    });

    document.addEventListener('mousemove', updatePointIndicator);
}

// 마우스 이동 시 포인트 표시기 업데이트
function updatePointIndicator(event) {
    if (isMeasureMode) {
        pointIndicator.style.display = 'block';
        pointIndicator.style.left = event.clientX + 'px';
        pointIndicator.style.top = event.clientY + 'px';
    } else {
        pointIndicator.style.display = 'none';
    }
}

// 측정 가이드 메시지 업데이트
function updateMeasureGuide(message) {
    measureGuide.textContent = message;
    measureGuide.classList.add('active');
}

// 측정 모드 시작/종료 함수 수정
function startMeasureMode() {
    isMeasureMode = true;
    isPointSelectionEnabled = false; // 초기에는 점 선택 비활성화
    points3D = []; // 점 배열 초기화
    currentMeasurementStartIndex = measurementLines3D.length; // 현재 측정 시작 인덱스 설정
    
    const measureControl = document.getElementById('measureControl');
    const measureControlGroup = document.querySelector('.measure-control-group');
    
    measureControl.style.display = 'block';
    measureControl.innerHTML = '+';
    measureControlGroup.classList.remove('active');
    
    document.addEventListener('mousemove', updatePointIndicator);
    
    // 측정선과 레이블 표시
    measurementLines3D.forEach(line => {
        line.visible = true;
    });
    
    measurementLabels.forEach(label => {
        label.visible = true;
    });
    
    // measureModeBtn 숨기기
    if (_("measureModeBtn")) _("measureModeBtn").style.display = 'none';
    
    // measureModeExitBtn 표시 및 스타일 적용
    if (_("measureModeExitBtn")) {
        const exitBtn = _("measureModeExitBtn");
        exitBtn.style.display = 'block';
        
        // 깜빡이는 애니메이션 효과 추가
        exitBtn.style.animation = 'pulse-yellow 2s infinite';
        
        // 애니메이션이 없으면 스타일 시트에 추가
        if (!document.getElementById('measure-exit-animation')) {
            const style = document.createElement('style');
            style.id = 'measure-exit-animation';
            style.textContent = `
                @keyframes pulse-yellow {
                    0% {
                        box-shadow: 0 0 0 0 rgba(255, 255, 0, 0.7);
                    }
                    70% {
                        box-shadow: 0 0 0 10px rgba(255, 255, 0, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(255, 255, 0, 0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// 측정 모드 토글
function toggleMeasureMode() {
    const measureControl = document.getElementById('measureControl');
    const measureControlGroup = document.querySelector('.measure-control-group');

    if (!isMeasureMode) {
        // 측정 모드 시작
        isMeasureMode = true;
        measureControl.innerHTML = '×';
        points3D = [];
    } else {
        // 측정 모드 종료
        exitMeasureMode();
    }
}

// 현재 측정 확인
function confirmMeasurements() {
    // 현재 위치의 측정 데이터 저장
    saveMeasurementsForCurrentLocation();
    
    // 현재 날짜의 측정 데이터 저장
    saveMeasurementsForCurrentDate();
    
    console.log("측정 데이터가 저장되었습니다.");
    
    // UI 상태 업데이트
    const measureControl = document.getElementById('measureControl');
    const measureControlGroup = document.querySelector('.measure-control-group');
    
    measureControl.style.display = 'block'; // + 아이콘 다시 표시
    measureControl.innerHTML = '+';
    measureControlGroup.classList.remove('active');
    isPointSelectionEnabled = false;
    points3D = []; // 새로운 측정을 위해 점 배열 초기화
}

// 현재 측정 삭제
function clearCurrentMeasurements() {
    // 현재 측정선만 삭제 (currentMeasurementStartIndex 이후의 측정선)
    const currentLines = measurementLines3D.slice(currentMeasurementStartIndex);
    const currentLabels = measurementLabels.slice(currentMeasurementStartIndex);
    
    // 현재 측정선과 레이블 제거
    currentLines.forEach(line => {
        if (line && scene) {
            scene.remove(line);
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
        }
    });
    
    // 3D 레이블(스프라이트) 제거
    currentLabels.forEach(label => {
        if (label && scene) {
            scene.remove(label);
            if (label.material && label.material.map) {
                label.material.map.dispose();
                label.material.dispose();
            }
        }
    });
    
    // 배열에서 현재 측정선 제거
    measurementLines3D.splice(currentMeasurementStartIndex);
    measurementLabels.splice(currentMeasurementStartIndex);
    measurementPoints3D.splice(currentMeasurementStartIndex);
    
    points3D = [];
}

// 현재 위치의 측정 데이터 저장 함수
function saveMeasurementsForCurrentLocation() {
    if (!selectedDateStr || !projectId || lastPanoramaUID === undefined) {
        console.warn("Cannot save location measurements: missing date, project ID, or location ID");
        return;
    }
    
    const locationKey = `${selectedDateStr}_${lastPanoramaUID}`;
    console.log(`Saving measurements for location ${locationKey}: ${measurementLines3D.length} lines, ${measurementLabels.length} labels`);
    
    // 현재 위치의 측정 데이터 수집
    const measurementData = {
        lines: [],
        labels: [],
        points3D: []
    };
    
    try {
        // 측정선 데이터 수집
        measurementLines3D.forEach((line) => {
            if (line && line.geometry && line.geometry.attributes && line.geometry.attributes.position) {
                try {
                    const positions = line.geometry.attributes.position.array;
                    const points = [];
                    for (let i = 0; i < positions.length; i += 3) {
                        points.push({
                            x: positions[i],
                            y: positions[i + 1],
                            z: positions[i + 2]
                        });
                    }
                    
                    measurementData.lines.push({
                        id: line.userData ? line.userData.id : Date.now().toString(),
                        points: points,
                        visible: line.visible
                    });
                } catch (e) {
                    console.error("Error saving line:", e);
                }
            }
        });
        
        // 측정 레이블 데이터 수집
        measurementLabels.forEach((label) => {
            if (label && label.position) {
                try {
                    measurementData.labels.push({
                        id: label.userData ? label.userData.id : Date.now().toString(),
                        position: {
                            x: label.position.x,
                            y: label.position.y,
                            z: label.position.z
                        },
                        text: label.userData && label.userData.text ? label.userData.text : '',
                        visible: label.visible,
                        scale: {
                            x: label.scale.x,
                            y: label.scale.y,
                            z: label.scale.z
                        }
                    });
                } catch (e) {
                    console.error("Error saving label:", e);
                }
            }
        });
        
        // 측정 포인트 데이터 수집
        measurementPoints3D.forEach((point) => {
            if (point && point.points && Array.isArray(point.points)) {
                try {
                    const pointData = {
                        id: point.id || Date.now().toString(),
                        points: point.points.map(p => ({ 
                            x: p.x, 
                            y: p.y, 
                            z: p.z 
                        }))
                    };
                    measurementData.points3D.push(pointData);
                } catch (e) {
                    console.error("Error saving point:", e);
                }
            }
        });
        
        // 현재 위치에 데이터 저장
        locationsMeasurementData[locationKey] = measurementData;
        
        // localStorage에 저장 (선택 사항)
        try {
            localStorage.setItem('vtLocationMeasurements_' + projectId, JSON.stringify(locationsMeasurementData));
            console.log("Location measurements saved to localStorage");
        } catch (e) {
            console.warn('Failed to save location measurements to localStorage:', e);
        }
    } catch (e) {
        console.error("Error in saveMeasurementsForCurrentLocation:", e);
    }
}

// 특정 위치의 측정 데이터 로드 함수
function loadMeasurementsForLocation(locationId) {
    if (!selectedDateStr || !projectId) {
        console.warn("Cannot load location measurements: missing date or project ID");
        return;
    }
    
    const locationKey = `${selectedDateStr}_${locationId}`;
    console.log(`Loading measurements for location ${locationKey}`);
    
    // 먼저 현재 측정 데이터 정리
    clearMeasurementLines();
    
    // 해당 위치의 측정 데이터가 없으면 종료
    if (!locationsMeasurementData[locationKey]) {
        console.log(`No measurements found for location ${locationKey}`);
        return;
    }
    
    const data = locationsMeasurementData[locationKey];
    console.log(`Found ${data.lines.length} lines for location ${locationKey}`);
    
    // 측정선 복원
    if (data.lines && Array.isArray(data.lines)) {
        data.lines.forEach((lineData) => {
            if (lineData.points && lineData.points.length >= 2) {
                try {
                    // 첫 번째와 두 번째 점으로 선 생성
                    const point1 = {
                        vector3D: new THREE.Vector3(
                            lineData.points[0].x,
                            lineData.points[0].y,
                            lineData.points[0].z
                        )
                    };
                    
                    const point2 = {
                        vector3D: new THREE.Vector3(
                            lineData.points[1].x,
                            lineData.points[1].y,
                            lineData.points[1].z
                        )
                    };
                    
                    // 두 점 사이의 거리 계산
                    const distance = point1.vector3D.distanceTo(point2.vector3D) / 10;
                    
                    // 측정선 그리기
                    const line = createMeasurementLine(point1, point2, distance, lineData.id);
                    
                    // 현재 측정 모드 상태에 따라 가시성 설정
                    line.visible = isMeasureMode;
                } catch (e) {
                    console.error("Error restoring measurement line:", e);
                }
            }
        });
    }
    
    // 측정 포인트 데이터 복원
    if (data.points3D && Array.isArray(data.points3D)) {
        data.points3D.forEach((pointData) => {
            if (pointData.points && Array.isArray(pointData.points)) {
                try {
                    const pointsVector3 = pointData.points.map(p => 
                        new THREE.Vector3(p.x, p.y, p.z)
                    );
                    
                    measurementPoints3D.push({
                        id: pointData.id,
                        points: pointsVector3
                    });
                } catch (e) {
                    console.error("Error restoring measurement points:", e);
                }
            }
        });
    }
    
    console.log(`Loaded measurements for location ${locationKey}: ${measurementLines3D.length} lines, ${measurementLabels.length} labels`);
}




