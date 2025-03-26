// multiview.js - 다중 뷰어 기능을 관리하는 파일

// 전역 변수 및 상태 관리
let isMultiViewMode = false;
let isSyncViewsEnabled = false;
let viewCount = 0;
let activeViews = []; // 활성화된 뷰어들을 저장하는 배열
let mainPanoramaContainer = null; // 원래 파노라마 컨테이너
let originalPanoramaParent = null; // 원래 파노라마의 부모 요소
let isInitialized = false; // 초기화 여부를 추적하는 플래그
let dateStr = ''; // 전역 dateStr 변수 추가

// 다중 뷰어 초기화 함수
function initMultiView() {
    // 이미 초기화되었으면 중복 초기화 방지
    if (isInitialized) {
        console.log("다중 뷰어가 이미 초기화되어 있습니다.");
        return;
    }
    
    console.log("다중 뷰어 기능 초기화 중...");
    isInitialized = true;

    // UI 요소 참조
    const multiViewToggle = _('multiview-toggle');
    const multiViewControls = _('multiview-controls');
    const syncViewsToggle = _('sync-views-toggle');
    const addViewBtn = _('add-view-btn');
    const multiViewContainer = _('multiview-container');
    const multiViewGrid = _('multiview-grid');
    
    // 요소가 없으면 오류 기록
    if (!multiViewToggle) console.error("multiViewToggle 요소를 찾을 수 없습니다");
    if (!multiViewControls) console.error("multiViewControls 요소를 찾을 수 없습니다");
    if (!syncViewsToggle) console.error("syncViewsToggle 요소를 찾을 수 없습니다");
    if (!addViewBtn) console.error("addViewBtn 요소를 찾을 수 없습니다");
    if (!multiViewContainer) console.error("multiViewContainer 요소를 찾을 수 없습니다");
    if (!multiViewGrid) console.error("multiViewGrid 요소를 찾을 수 없습니다");
    
    // 메인 파노라마 요소 참조
    mainPanoramaContainer = _('panorama');
    originalPanoramaParent = mainPanoramaContainer.parentElement;

    // 다중 뷰어 토글 버튼 이벤트 리스너
    multiViewToggle.addEventListener('click', function() {
        isMultiViewMode = !isMultiViewMode;
        console.log("다중 뷰어 모드:", isMultiViewMode ? "활성화" : "비활성화");
        
        if (isMultiViewMode) {
            // 다중 뷰어 모드 활성화
            multiViewToggle.style.background = 'rgba(33, 150, 243, 0.7)';
            multiViewToggle.style.boxShadow = '0 0 8px rgba(33, 150, 243, 0.5)';
            window.isPopupOpen = true;
            // 컨트롤 표시
            if (multiViewControls) {
                multiViewControls.style.display = 'block';
            }
            
            // 컨테이너 표시
            if (multiViewContainer) {
                multiViewContainer.style.display = 'block';
            }
            
            // 애니메이션 효과
            if (multiViewContainer) {
                multiViewContainer.style.opacity = '0';
                multiViewContainer.style.transition = 'opacity 0.3s ease-in-out';
                setTimeout(() => {
                    multiViewContainer.style.opacity = '1';
                }, 50);
            }
            
            // 첫 번째 뷰어에 기존 파노라마 이동
            if (activeViews.length === 0) {
                console.log("첫 번째 뷰어 설정 및 두 번째 뷰어 자동 추가 호출");
                addNewView();
                addNewView();
            }
            
            // 네비게이션 버튼만 숨기기 (맵 컨테이너는 유지)
            const navigationButtons = _('navigationButtonsContainer');
            if (navigationButtons) navigationButtons.style.visibility = 'hidden';
            
            // 사용자 안내 토스트 메시지 표시
            showToast('다중 뷰어 모드가 활성화되었습니다.');
            
            // 현재 파노라마 화면의 구도 저장
            window.multiViewInitialLat = window.lat;
            window.multiViewInitialLon = window.lon;
            // console.log(`다중뷰 모드 진입 시 구도 저장: lat=${window.lat}, lon=${window.lon}`);
        } else {
            // 다중 뷰어 모드 비활성화
            multiViewToggle.style.background = 'rgba(0, 0, 0, 0.5)';
            multiViewToggle.style.boxShadow = 'none';
            window.isPopupOpen = false;

            // 네비게이션 버튼 표시
            const navigationButtons = _('navigationButtonsContainer');
            if (navigationButtons) navigationButtons.style.visibility = 'visible';
            
            // 애니메이션 효과로 부드럽게 전환
            if (multiViewContainer) {
                multiViewContainer.style.opacity = '0';
                multiViewContainer.style.transition = 'opacity 0.3s ease-in-out';
            }
            
            // 메인 뷰의 구도 저장
            if (activeViews.length > 0) {
                // const mainView = activeViews[0];
                const mainView = document.getElementById('panorama-view-0');
                window.multiViewExitLat = mainView.viewerInstance.state.lat || window.multiViewInitialLat;
                window.multiViewExitLon = mainView.viewerInstance.state.lon || window.multiViewInitialLon;
                // console.log(`다중뷰 종료 시 구도 저장: lat=${window.multiViewExitLat}, lon=${window.multiViewExitLon}`);
            }            
            setTimeout(() => {
                if (multiViewControls) {
                    multiViewControls.style.display = 'none';
                }
                
                if (multiViewContainer) {
                    multiViewContainer.style.display = 'none';
                }
                
                // 원래 파노라마 위치로 복원
                restoreMainPanorama();
            }, 300);
            
            // 사용자 안내 토스트 메시지 표시
            showToast('기본 뷰어 모드로 돌아갑니다.');

        }
    });

    // 뷰 동기화 토글 이벤트 리스너
    syncViewsToggle.addEventListener('change', function() {
        isSyncViewsEnabled = syncViewsToggle.checked;
        console.log("뷰 동기화 " + (isSyncViewsEnabled ? "활성화" : "비활성화"));
        
        if (isSyncViewsEnabled) {
            synchronizeAllViews();
        } else {
            desynchronizeViews();
        }
    });

    // 창 추가 버튼 이벤트 리스너
    addViewBtn.addEventListener('click', function() {
        if (viewCount < 4) {
            addNewView();
        } else {
            alert('최대 4개까지만 창을 추가할 수 있습니다.');
        }
    });
}

// 맵 컨테이너를 뷰어에 추가하는 헬퍼 함수
function addMapToViewer(panoramaView, index) {
    // 원본 맵 컨테이너 가져오기
    const originalMapContainer = _('mapContainer');
    if (!originalMapContainer) {
        console.error("원본 맵 컨테이너를 찾을 수 없습니다");
        return;
    }
    
    // 맵 컨테이너 복제
    const mapClone = document.createElement('div');
    mapClone.id = `mapContainer-view-${index}`;
    mapClone.className = 'map-container-clone';
    mapClone.style.position = 'absolute';
    mapClone.style.top = '10px';
    mapClone.style.left = '10px';
    mapClone.style.width = '150px'; // 원본보다 작게 설정
    mapClone.style.height = '100px';
    mapClone.style.zIndex = '900';
    mapClone.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    mapClone.style.borderRadius = '4px';
    mapClone.style.overflow = 'hidden';
    mapClone.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
    mapClone.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    mapClone.style.transition = 'width 0.3s, height 0.3s';
    
    // 토글 버튼 추가
    const toggleBtn = document.createElement('button');
    toggleBtn.style.position = 'absolute';
    toggleBtn.style.top = '2px';
    toggleBtn.style.left = '2px';
    toggleBtn.style.background = 'rgba(255, 255, 255, 0.8)';
    toggleBtn.style.border = 'none';
    toggleBtn.style.width = '16px';
    toggleBtn.style.height = '16px';
    toggleBtn.style.fontSize = '12px';
    toggleBtn.style.lineHeight = '1';
    toggleBtn.style.padding = '0';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.zIndex = '901';
    toggleBtn.style.borderRadius = '2px';
    toggleBtn.innerHTML = '−';
    
    // 맵 이미지 컨테이너 추가
    const mapFigure = document.createElement('figure');
    mapFigure.id = `map-figure-view-${index}`;
    mapFigure.style.position = 'relative';
    mapFigure.style.width = '100%';
    mapFigure.style.height = '100%';
    mapFigure.style.margin = '0';
    mapFigure.style.padding = '0';
    mapFigure.style.overflow = 'auto';
    
    // 맵 이미지 추가
    const mapImg = document.createElement('img');
    mapImg.id = `mapImage-view-${index}`;
    const originalMapImg = _('mapImage');
    if (originalMapImg && originalMapImg.src) {
        mapImg.src = originalMapImg.src;
    } else {
        // 기본 맵 이미지 설정 (없을 경우)
        mapImg.src = ''; // 필요시 기본 이미지 설정
    }
    mapImg.style.width = '100%';
    mapImg.style.height = 'auto';
    mapImg.style.display = 'block';
    
    // 스팟 컨테이너 추가
    const spotContainer = document.createElement('div');
    spotContainer.id = `spot-container-view-${index}`;
    spotContainer.style.position = 'absolute';
    spotContainer.style.top = '0';
    spotContainer.style.left = '0';
    spotContainer.style.width = '100%';
    spotContainer.style.height = '100%';
    spotContainer.style.pointerEvents = 'none'; // 이벤트는 맵 이미지에서 처리
    
    // 리사이즈 핸들 추가
    const resizeHandle = document.createElement('div');
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.right = '0px';
    resizeHandle.style.bottom = '0px';
    resizeHandle.style.width = '10px';
    resizeHandle.style.height = '10px';
    resizeHandle.style.background = 'gray';
    resizeHandle.style.cursor = 'nwse-resize';
    resizeHandle.style.zIndex = '902';
    
    mapFigure.appendChild(mapImg);
    mapFigure.appendChild(spotContainer);
    mapClone.appendChild(toggleBtn);
    mapClone.appendChild(mapFigure);
    mapClone.appendChild(resizeHandle);
    
    // 맵 컨테이너를 파노라마 뷰에 추가
    panoramaView.appendChild(mapClone);
    
    // 토글 버튼 이벤트 리스너 추가
    let isMapVisible = true;
    toggleBtn.addEventListener('click', function() {
        if (isMapVisible) {
            mapFigure.style.display = 'none';
            resizeHandle.style.display = 'none';
            mapClone.style.height = '20px';
            toggleBtn.innerHTML = '+';
            isMapVisible = false;
        } else {
            mapFigure.style.display = 'block';
            resizeHandle.style.display = 'block';
            mapClone.style.height = '100px';
            toggleBtn.innerHTML = '−';
            isMapVisible = true;
        }
    });
    
    // 맵 클릭 이벤트 추가 (스팟 위치 이동)
    mapImg.addEventListener('click', function(e) {
        // 맵 이미지 내에서의 상대적 위치 (퍼센트) 계산
        const rect = mapImg.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        
        // 다른 창도 동기화할지 확인
        const syncViews = isSyncViewsEnabled;
        
        // 스팟 위치 표시 (현재 뷰어만)
        updateSpotPosition(spotContainer, x, y);
        
        // 현재 위치 정보 기록
        console.log(`맵 클릭: x=${x.toFixed(2)}, y=${y.toFixed(2)}, 뷰 인덱스: ${index}, 동기화: ${syncViews ? "켜짐" : "꺼짐"}`);
        
        // 위치 이동 처리 (실제 로직은 애플리케이션에 따라 다를 수 있음)
        if (typeof window.moveToLocationByCoords === 'function') {
            // 기존 애플리케이션의 위치 이동 함수 호출
            window.moveToLocationByCoords(x, y);
        } else {
            console.log("moveToLocationByCoords 함수를 찾을 수 없습니다.");
        }
        
        // 뷰 동기화가 활성화된 경우에만 다른 맵의 스팟도 업데이트
        if (syncViews) {
            updateAllMapSpots(x, y, index);
        }
    });
    
    // 드래그하여 맵 위치 이동 기능 구현
    let isDragging = false;
    let dragOffsetX, dragOffsetY;
    
    mapClone.addEventListener('mousedown', function(e) {
        // 리사이즈 핸들이나 토글 버튼을 클릭한 경우는 제외
        if (e.target === resizeHandle || e.target === toggleBtn) return;
        
        // 맵 이미지 클릭 이벤트는 별도로 처리
        if (e.target === mapImg) return;
        
        isDragging = true;
        dragOffsetX = e.clientX - mapClone.getBoundingClientRect().left;
        dragOffsetY = e.clientY - mapClone.getBoundingClientRect().top;
        
        mapClone.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        const containerRect = panoramaView.getBoundingClientRect();
        const newLeft = e.clientX - containerRect.left - dragOffsetX;
        const newTop = e.clientY - containerRect.top - dragOffsetY;
        
        // 맵이 뷰어 영역을 벗어나지 않도록 제한
        const maxLeft = containerRect.width - mapClone.offsetWidth;
        const maxTop = containerRect.height - mapClone.offsetHeight;
        
        mapClone.style.left = `${Math.max(0, Math.min(maxLeft, newLeft))}px`;
        mapClone.style.top = `${Math.max(0, Math.min(maxTop, newTop))}px`;
    });
    
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            mapClone.style.cursor = 'default';
        }
    });
    
    // 리사이즈 핸들 기능 구현
    let isResizing = false;
    let startWidth, startHeight, startX, startY;
    
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startWidth = parseInt(mapClone.style.width);
        startHeight = parseInt(mapClone.style.height);
        startX = e.clientX;
        startY = e.clientY;
        
        e.preventDefault(); // 텍스트 선택 방지
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        // 최소 크기 제한
        const newWidth = Math.max(100, startWidth + dx);
        const newHeight = Math.max(50, startHeight + dy);
        
        // 최대 크기 제한 (뷰어 크기의 80%로 제한)
        const containerRect = panoramaView.getBoundingClientRect();
        const maxWidth = containerRect.width * 0.8;
        const maxHeight = containerRect.height * 0.8;
        
        mapClone.style.width = `${Math.min(maxWidth, newWidth)}px`;
        mapClone.style.height = `${Math.min(maxHeight, newHeight)}px`;
    });
    
    document.addEventListener('mouseup', function() {
        isResizing = false;
    });
    
    // // 맵 이미지 업데이트 리스너 설정
    // setupMapUpdateListener(mapImg.id, index);
    
    console.log(`맵 컨테이너 복제 및 추가 완료 (인덱스: ${index})`);
    
    // 초기 현재 위치 스팟 표시
    updateInitialSpotPosition(spotContainer, index);
    
    return mapClone;
}

// 스팟 위치 업데이트
function updateSpotPosition(spotContainer, x, y) {
    // 기존 스팟이 있으면 제거
    const existingSpot = spotContainer.querySelector('.map-spot');
    if (existingSpot) {
        existingSpot.remove();
    }
    
    // 새 스팟 생성
    const spot = document.createElement('div');
    spot.className = 'map-spot';
    spot.style.position = 'absolute';
    spot.style.width = '10px';
    spot.style.height = '10px';
    spot.style.borderRadius = '50%';
    spot.style.backgroundColor = 'rgba(33, 150, 243, 0.8)';
    spot.style.boxShadow = '0 0 4px rgba(255, 255, 255, 0.8)';
    spot.style.transform = 'translate(-50%, -50%)';
    spot.style.left = `${x * 100}%`;
    spot.style.top = `${y * 100}%`;
    spot.style.pointerEvents = 'none';
    
    // 위치 정보를 데이터 속성으로 저장
    spot.dataset.x = x;
    spot.dataset.y = y;
    
    // 스팟 추가
    spotContainer.appendChild(spot);
    
    // 애니메이션 효과
    spot.animate([
        { transform: 'translate(-50%, -50%) scale(1.5)', opacity: 0.7 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
    ], {
        duration: 300,
        iterations: 1
    });
}

// 모든 맵의 스팟 위치 업데이트 (동기화)
function updateAllMapSpots(x, y, sourceIndex) {
    // 동기화가 활성화된 경우에만 다른 뷰어에도 적용
    if (!isSyncViewsEnabled) {
        console.log("뷰 동기화가 비활성화되어 있어 현재 뷰어만 업데이트됩니다.");
        return;
    }
    
    for (let i = 0; i < activeViews.length; i++) {
        // 소스 인덱스와 동일한 뷰는 건너뛰기
        if (i === sourceIndex) continue;
        
        const spotContainer = document.getElementById(`spot-container-view-${i}`);
        if (spotContainer) {
            updateSpotPosition(spotContainer, x, y);
        }
    }
}

// 초기 스팟 위치 설정
function updateInitialSpotPosition(spotContainer, viewIndex) {
    // 기존 위치 정보가 있으면 해당 위치에 스팟 표시
    // 이 부분은 애플리케이션에 따라 다를 수 있음
    let x = 0.5; // 기본 위치 (중앙)
    let y = 0.5;
    
    // 원본 맵의 스팟 위치 확인 (예시)
    const originalSpot = document.querySelector('#mapContainer .map-spot');
    if (originalSpot) {
        const originalMapImg = document.getElementById('mapImage');
        if (originalMapImg) {
            const rect = originalMapImg.getBoundingClientRect();
            const spotRect = originalSpot.getBoundingClientRect();
            
            // 스팟의 상대적 위치 계산
            x = (spotRect.left + spotRect.width/2 - rect.left) / rect.width;
            y = (spotRect.top + spotRect.height/2 - rect.top) / rect.height;
        }
    }
    
    // 스팟 위치 업데이트
    updateSpotPosition(spotContainer, x, y);
}

// 맵 이미지 업데이트 리스너 설정
function setupMapUpdateListener(mapImgId, index) {
    // 원본 맵 이미지의 변경 감지 (MutationObserver 사용)
    const originalMapImg = document.getElementById('mapImage');
    if (!originalMapImg) return;
    
    // 이미지 URL 변경 감지를 위한 MutationObserver 설정
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'src') {
                // 동기화가 활성화된 경우에만 다른 뷰어 맵 이미지도 업데이트
                if (isSyncViewsEnabled) {
                    // 복제된 맵 이미지 업데이트
                    const mapImgClone = document.getElementById(mapImgId);
                    if (mapImgClone) {
                        mapImgClone.src = originalMapImg.src;
                        console.log(`맵 이미지 업데이트 (인덱스: ${index}, 새 소스: ${originalMapImg.src}, 동기화: 켜짐)`);
                    }
                } else {
                    console.log(`맵 이미지 변경 감지됨 (원본 소스: ${originalMapImg.src}, 동기화: 꺼짐 - 업데이트 건너뜀)`);
                }
            }
        });
    });
    
    // 원본 맵 이미지의 src 속성 변경 감지
    observer.observe(originalMapImg, { attributes: true, attributeFilter: ['src'] });
}

// 새 뷰어 추가
function addNewView() {
    const multiViewGrid = _('multiview-grid');
    const viewIndex = viewCount;
    const viewerContainer = createViewerContainer(viewIndex);
    
    multiViewGrid.appendChild(viewerContainer);
    
    // 뷰어에 파노라마 추가
    const panoramaClone = _(`panorama-view-${viewIndex}`);

    // 맵 컨테이너 추가
    addMapToViewer(panoramaClone, viewIndex);
    
    const currentDate = window.selectedDateStr || window.currentDateStr;
    
    // 위치 선택을 위한 로직
    // 주요 위치를 다른 뷰어에 표시하는 시나리오를 위해 기존 위치와 다른 위치를 선택
    let selectedLocation;
    
    // 사용 가능한 모든 위치 목록 가져오기
    const availableLocations = [];
    if (window.panoramaData && window.panoramaData.locations) {
        window.panoramaData.locations.forEach(function(loc) {
            if (loc.uid !== undefined) {
                availableLocations.push(loc.uid);
            }
        });
    }
    
    if (availableLocations.length > 0) {
        // 랜덤한 위치 선택 (또는 사용자가 선택 가능하도록 UI 제공 가능)
        // 현재 구현에서는 단순히 인덱스에 따라 위치를 순환
        const locationIndex = viewIndex % availableLocations.length;
        selectedLocation = availableLocations[locationIndex];
    } else {
        // 사용 가능한 위치가 없으면 현재 위치 사용
        selectedLocation = window.lastPanoramaUID;
    }

    if (viewIndex == 0) {
        selectedLocation = window.lastPanoramaUID;
    }
    
    // 새 파노라마 초기화
    initNewPanorama(panoramaClone.id, currentDate, selectedLocation);

    activeViews.push({
        index: viewIndex,
        element: panoramaClone,
        container: viewerContainer
    });
    
    // 레이아웃 업데이트
    viewCount++;
    updateGridLayout();
}

// 뷰어 컨테이너 생성
function createViewerContainer(index) {
    console.log("뷰어 컨테이너 생성 중 - 인덱스:", index);
    
    const viewerContainer = document.createElement('div');
    viewerContainer.className = 'viewer-container';
    viewerContainer.id = `viewer-container-${index}`;
    viewerContainer.style.position = 'relative';
    viewerContainer.style.width = '100%';
    viewerContainer.style.height = '100%';
    viewerContainer.style.border = '2px solid rgba(255, 255, 255, 0.5)';
    viewerContainer.style.borderRadius = '8px';
    viewerContainer.style.overflow = 'hidden';
    viewerContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    viewerContainer.style.display = 'block';
    viewerContainer.style.minHeight = '200px';
    
    // 뷰어 헤더 생성 (닫기 버튼 포함)
    const viewerHeader = document.createElement('div');
    viewerHeader.className = 'viewer-header';
    viewerHeader.style.position = 'absolute';
    viewerHeader.style.top = '0';
    viewerHeader.style.right = '0';
    viewerHeader.style.padding = '5px';
    viewerHeader.style.zIndex = '1000';
    
    // index가 0이 아닐 때만 닫기 버튼 표시 (첫 번째 뷰는 닫을 수 없음)
    if (index > 0) {
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.background = 'rgba(244, 67, 54, 0.7)';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '3px';
        closeBtn.style.padding = '2px 5px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '14px';
        
        closeBtn.addEventListener('click', function() {
            removeView(index);
        });
        
        viewerHeader.appendChild(closeBtn);
    } 
    else {
        // 첫 번째 뷰에는 라벨 추가
        const viewLabel = document.createElement('div');
        viewLabel.textContent = 'Main View';
        viewLabel.style.background = 'rgba(33, 150, 243, 0.7)';
        viewLabel.style.color = 'white';
        viewLabel.style.border = 'none';
        viewLabel.style.borderRadius = '3px';
        viewLabel.style.padding = '2px 8px';
        viewLabel.style.fontSize = '12px';
        viewLabel.style.fontWeight = 'bold';
        viewerHeader.appendChild(viewLabel);
    }
    
    // 뷰어 내용 영역 생성
    const viewerContent = document.createElement('div');
    viewerContent.className = 'viewer-content';
    viewerContent.style.width = '100%';
    viewerContent.style.height = '100%';
    viewerContent.style.backgroundColor = '#000'; // 배경색 추가
    
    // 새 파노라마 컨테이너 생성
    const panoramaClone = document.createElement('div');
    panoramaClone.id = `panorama-view-${index}`;
    panoramaClone.className = 'panorama-view';
    panoramaClone.style.width = '100%';
    panoramaClone.style.height = '100%';
    panoramaClone.style.position = 'relative';
    panoramaClone.style.backgroundColor = '#000';
    viewerContent.appendChild(panoramaClone);

    viewerContainer.appendChild(viewerHeader);
    viewerContainer.appendChild(viewerContent);

    console.log("뷰어 컨테이너 생성 완료:", viewerContainer);
    
    return viewerContainer;
}

// 새 파노라마 초기화 함수
function initNewPanorama(containerId, currentDate, currentLocation) {
    // 원본 파노라마와 동일한 날짜와 위치로 새 파노라마 생성
    console.log(`새 파노라마 초기화: ${containerId}, 날짜: ${currentDate}, 위치: ${currentLocation}`);
    
    const panoramaView = _(containerId);
    if (!panoramaView) {
        console.error(`컨테이너를 찾을 수 없음: ${containerId}`);
        return;
    }
    
    // 뷰어 인덱스 추출
    const viewerIndex = containerId.split('-').pop();
    
    // 현재 선택된 위치 가져오기
    const locationIndex = currentLocation || window.currentLocation || window.lastPanoramaUID;
    
    // 현재 선택된 날짜 가져오기
    const initialDateStr = currentDate || window.selectedDateStr || window.currentDateStr;
    dateStr = initialDateStr; // 전역 dateStr 변수 업데이트
    
    // Three.js 초기화를 위한 준비
    const viewerCamera = new THREE.PerspectiveCamera(60, panoramaView.clientWidth / panoramaView.clientHeight, 1, 200);
    viewerCamera.target = new THREE.Vector3(0, 0, 1);
    
    // 렌더러 생성
    const viewerRenderer = new THREE.WebGLRenderer({ antialias: true });
    viewerRenderer.setSize(panoramaView.clientWidth, panoramaView.clientHeight);
    panoramaView.appendChild(viewerRenderer.domElement);
    
    // 씬 생성
    const viewerScene = new THREE.Scene();
    
    // 날짜 탐색 컨트롤 추가
    const dateNav = document.createElement('div');
    dateNav.className = 'date-nav-clone';
    dateNav.id = `date-nav-${viewerIndex}`;
    dateNav.style.position = 'absolute';
    dateNav.style.bottom = '10px'; // 상단에서 하단으로 위치 변경
    dateNav.style.left = '50%';
    dateNav.style.transform = 'translateX(-50%)';
    dateNav.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    dateNav.style.color = 'white';
    dateNav.style.padding = '5px 10px';
    dateNav.style.borderRadius = '4px';
    dateNav.style.fontSize = '14px';
    dateNav.style.display = 'flex';
    dateNav.style.alignItems = 'center';
    dateNav.style.gap = '10px';
    dateNav.style.zIndex = '1000';
    dateNav.style.userSelect = 'none';
    
    // 이전 날짜 버튼
    const prevDateBtn = document.createElement('span');
    prevDateBtn.textContent = '◀';
    prevDateBtn.style.cursor = 'pointer';
    prevDateBtn.style.padding = '2px 5px';
    prevDateBtn.style.borderRadius = '3px';
    prevDateBtn.style.transition = 'background 0.2s';
    
    // 캘린더 토글 버튼
    const calendarToggle = document.createElement('span');
    calendarToggle.textContent = '📅';
    calendarToggle.style.cursor = 'pointer';
    calendarToggle.style.padding = '2px 5px';
    calendarToggle.style.borderRadius = '3px';
    calendarToggle.style.transition = 'background 0.2s';
    
    // 현재 날짜 표시
    const currentDateSpan = document.createElement('span');
    currentDateSpan.textContent = dateStr;
    currentDateSpan.style.fontWeight = 'bold';
    currentDateSpan.style.padding = '2px 5px';
    currentDateSpan.style.borderRadius = '3px';
    
    // 다음 날짜 버튼
    const nextDateBtn = document.createElement('span');
    nextDateBtn.textContent = '▶';
    nextDateBtn.style.cursor = 'pointer';
    nextDateBtn.style.padding = '2px 5px';
    nextDateBtn.style.borderRadius = '3px';
    nextDateBtn.style.transition = 'background 0.2s';
    
    // 날짜 네비게이션에 요소 추가
    dateNav.appendChild(prevDateBtn);
    dateNav.appendChild(calendarToggle);
    dateNav.appendChild(currentDateSpan);
    dateNav.appendChild(nextDateBtn);
    
    // 미니 캘린더 컨테이너
    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'mini-calendar-container';
    calendarContainer.id = `calendar-container-${viewerIndex}`;
    calendarContainer.style.position = 'absolute';
    calendarContainer.style.top = '50%'; // 뷰어의 중앙에 표시
    calendarContainer.style.left = '50%';
    calendarContainer.style.transform = 'translate(-50%, -50%)'; // 중앙 정렬
    calendarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    calendarContainer.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    calendarContainer.style.borderRadius = '5px';
    calendarContainer.style.padding = '10px';
    calendarContainer.style.zIndex = '2000';
    calendarContainer.style.display = 'none';
    
    // 캘린더 헤더
    const calendarHeader = document.createElement('div');
    calendarHeader.style.display = 'flex';
    calendarHeader.style.justifyContent = 'space-between';
    calendarHeader.style.alignItems = 'center';
    calendarHeader.style.marginBottom = '10px';
    
    const prevMonthBtn = document.createElement('span');
    prevMonthBtn.textContent = '◀';
    prevMonthBtn.style.cursor = 'pointer';
    
    const calendarTitle = document.createElement('span');
    calendarTitle.textContent = '날짜 선택';
    calendarTitle.style.fontWeight = 'bold';
    
    const nextMonthBtn = document.createElement('span');
    nextMonthBtn.textContent = '▶';
    nextMonthBtn.style.cursor = 'pointer';
    
    calendarHeader.appendChild(prevMonthBtn);
    calendarHeader.appendChild(calendarTitle);
    calendarHeader.appendChild(nextMonthBtn);
    
    // 캘린더 컨텐츠
    const calendarContent = document.createElement('div');
    calendarContent.className = 'calendar-content';
    
    calendarContainer.appendChild(calendarHeader);
    calendarContainer.appendChild(calendarContent);
    
    // 로딩 표시기 추가
    const loadingIndicator = document.createElement('div');
    loadingIndicator.style.position = 'absolute';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.color = 'white';
    loadingIndicator.style.background = 'rgba(0, 0, 0, 0.7)';
    loadingIndicator.style.padding = '10px 20px';
    loadingIndicator.style.borderRadius = '5px';
    loadingIndicator.style.fontSize = '16px';
    loadingIndicator.innerHTML = 'Loading...';
    
    // UI 요소들을 뷰어에 추가
    panoramaView.appendChild(dateNav);
    panoramaView.appendChild(calendarContainer);
    panoramaView.appendChild(loadingIndicator);
    
    // 이벤트 핸들러 함수들
    function changePanoramaDate(newDateStr) {
        console.log(`changePanoramaDate 호출: 이전 dateStr=${dateStr}, 새 dateStr=${newDateStr}, 뷰어 인덱스=${viewerIndex}`);
        
        if (!window.panoramaDates || !window.find_dataURL) {
            console.error('날짜 변경에 필요한 함수 또는 데이터가 없습니다');
            return;
        }
        
        // 실제 날짜 데이터가 있는지 확인
        const dateExists = window.panoramaDates.some(item => item.date === newDateStr);
        if (!dateExists) {
            console.error(`존재하지 않는 날짜입니다: ${newDateStr}`);
            return;
        }
        
        // 현재 날짜 텍스트 업데이트
        currentDateSpan.textContent = newDateStr;
        dateStr = newDateStr; // 전역 dateStr 변수 업데이트
        
        // 로딩 표시기 표시
        loadingIndicator.style.display = 'block';
        
        try {
            // 같은 위치의 다른 날짜 파노라마 로드 - 각 뷰어별로 독립적으로 처리
            startPanoramaInviewer(newDateStr, locationIndex, viewerIndex);
        } catch (error) {
            console.error('파노라마 로드 중 오류 발생:', error);
            loadingIndicator.style.display = 'none';
            showToast(`파노라마 로드 실패: ${error.message}`, 3000);
            return;
        }
        
        // 로딩 표시기 숨기기
        setTimeout(() => {
            loadingIndicator.style.display = 'none';
        }, 1000); // 최소한의 로딩 시간을 보장하기 위해 약간의 지연 추가
    }
    
    // 날짜 변경 함수
    function loadPanoramaForDate(dateStr, locationId, viewerIdx) {
        // JSON URL 찾기 - panorama.js와 정확히 동일한 방식 사용
        const jsonUrl = window.find_dataURL(dateStr);
        if (!jsonUrl) {
            console.error(`${dateStr} 날짜의 JSON URL을 찾을 수 없습니다`);
            return;
        }
        
        // panorama.js와 동일한 방식으로 URL 구성
        // 참고: panorama.js의 startPanorama 함수에서는 target_dataURL = datesJsonUrl + target_dataURL 방식 사용
        const fullJsonUrl = window.datesJsonUrl + jsonUrl;
        
        console.log(`${viewerIdx}번 뷰어의 날짜 변경 정보:`, { 
            dateStr, 
            locationId, 
            jsonUrl,
            datesJsonUrl: window.datesJsonUrl,
            fullJsonUrl
        });
        
        // 기존 리소스 정리
        if (panoramaView.viewerInstance) {
            panoramaView.viewerInstance.destroy();
        }
        
        // 캐시 방지를 위한 타임스탬프 추가 (parseConfigJSON 함수 참조)
        const nocacheUrl = fullJsonUrl + (fullJsonUrl.includes('?') ? '&' : '?') + 'v=' + new Date().getTime();
        
        console.log(`${viewerIdx}번 뷰어 최종 JSON 로드 URL:`, nocacheUrl);
        
        // JSON 파싱 및 파노라마 로드
        fetch(nocacheUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP 오류: ${response.status} - ${nocacheUrl}`);
                }
                return response.json();
            })
            .then(data => {
                // 위치 정보 찾기
                const location = data.locations.find(loc => loc.uid === locationId);
                if (!location) {
                    throw new Error(`위치 ID(${locationId})에 해당하는 위치를 찾을 수 없습니다`);
                }
                
                // 이미지 URL 설정
                const imgUrl = location.image.default;
                // panorama.js와 동일한 방식으로 URL 구성
                const fullImgUrl = window.datesJsonUrl + imgUrl;
                
                console.log(`${viewerIdx}번 뷰어 날짜 변경: ${dateStr}, 위치: ${locationId}, 이미지: ${fullImgUrl}`);
                
                // 텍스처 로드 및 새 파노라마 생성
                const textureLoader = new THREE.TextureLoader();
                return new Promise((resolve, reject) => {
                    textureLoader.load(
                        fullImgUrl,
                        texture => resolve({ texture, location, data }),
                        xhr => {
                            const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
                            loadingIndicator.innerHTML = `파노라마 로딩 중... ${progress}%`;
                        },
                        error => reject(error)
                    );
                });
            })
            .then(({ texture, location, data }) => {
                // 로딩 표시기 숨기기
                loadingIndicator.style.display = 'none';
                
                // 새 파노라마 생성
                const geometry = new THREE.SphereGeometry(200, 50, 30);
                geometry.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
                
                const material = new THREE.MeshBasicMaterial({
                    map: texture
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                
                // 씬 초기화
                while (viewerScene.children.length > 0) {
                    viewerScene.remove(viewerScene.children[0]);
                }
                
                viewerScene.add(mesh);
                
                // 뷰어 상태 업데이트
                viewerState.lat = location.cameraTargets && location.cameraTargets[-1] ? 
                                location.cameraTargets[-1].lat : 0;
                viewerState.lon = location.cameraTargets && location.cameraTargets[-1] ? 
                                location.cameraTargets[-1].lon : 0;
                
                // 뷰어 정보 업데이트
                const infoLabel = panoramaView.querySelector('.viewer-info-label');
                if (infoLabel) {
                    infoLabel.textContent = `위치: ${location.uid}, 날짜: ${dateStr}`;
                }
                
                // 새 날짜 정보 저장
                panoramaView.viewerInstance.dateStr = dateStr;
                
                // 동기화 기능이 켜져 있을 때만 맵 이미지 업데이트
                if (isSyncViewsEnabled) {
                    updateMapForViewer(viewerIdx, data, location);
                    showToast(`모든 뷰어의 맵이 동기화되었습니다.`);
                } else {
                    // 현재 뷰어의 맵만 업데이트
                    const mapContainer = document.getElementById(`mapContainer-view-${viewerIdx}`);
                    if (mapContainer) {
                        const mapImg = document.getElementById(`mapImage-view-${viewerIdx}`);
                        if (mapImg && matchingMap && matchingMap.image) {
                            mapImg.src = window.datesJsonUrl + matchingMap.image;
                        }
                    }
                }
                
                // 로딩 성공 토스트 메시지
                showToast(`${viewerIdx}번 뷰어의 날짜가 ${dateStr}로 변경되었습니다`);
            })
            .catch(error => {
                console.error('파노라마 로드 중 오류 발생:', error);
                loadingIndicator.innerHTML = '파노라마 로딩 실패';
                loadingIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
                
                // 오류 발생 토스트 메시지
                showToast(`날짜 변경 실패: ${error.message}`, 5000);
            });
    }
    
    // 맵 업데이트 함수
    function updateMapForViewer(viewerIdx, data, location) {
        const mapContainer = document.getElementById(`mapContainer-view-${viewerIdx}`);
        if (!mapContainer) return;
        
        const mapImg = document.getElementById(`mapImage-view-${viewerIdx}`);
        if (!mapImg) return;
        
        // 해당 위치의 맵 찾기
        const matchingMap = data.maps.find(map => map.uid === location.mapUid);
        if (matchingMap && matchingMap.image) {
            // panorama.js와 동일한 방식으로 URL 구성
            mapImg.src = window.datesJsonUrl + matchingMap.image;
            console.log(`${viewerIdx}번 뷰어 맵 이미지 업데이트:`, mapImg.src);
        }
        
        // 스팟 위치 업데이트
        const spotContainer = document.getElementById(`spot-container-view-${viewerIdx}`);
        if (spotContainer && location.mapSpot) {
            updateSpotPosition(spotContainer, location.mapSpot.x, location.mapSpot.y);
        }
    }
    
    // 캘린더 토글 기능
    calendarToggle.addEventListener('click', function() {
        // 캘린더 표시 상태 토글
        if (calendarContainer.style.display === 'none') {
            calendarContainer.style.display = 'block';
            // 캘린더 내용 생성
            renderMiniCalendar(calendarContent, dateStr);
        } else {
            calendarContainer.style.display = 'none';
        }
    });
    
    // 이전 날짜 버튼 이벤트
    prevDateBtn.addEventListener('click', function() {
        const currentIndex = findDateIndex(dateStr);
        if (currentIndex > 0) {
            const prevDate = window.panoramaDates[currentIndex - 1].date;
            currentDateSpan.textContent = prevDate;
            dateStr = prevDate; // 전역 dateStr 변수 업데이트
            changePanoramaDate(prevDate);
        }
    });
    
    // 다음 날짜 버튼 이벤트
    nextDateBtn.addEventListener('click', function() {
        const currentIndex = findDateIndex(dateStr);
        if (currentIndex !== -1 && currentIndex < window.panoramaDates.length - 1) {
            const nextDate = window.panoramaDates[currentIndex + 1].date;
            currentDateSpan.textContent = nextDate;
            dateStr = nextDate; // 전역 dateStr 변수 업데이트
            changePanoramaDate(nextDate);
        }
    });
    
    // 날짜 인덱스 찾기 함수
    function findDateIndex(dateStr) {
        if (!window.panoramaDates) return -1;
        return window.panoramaDates.findIndex(item => item.date === dateStr);
    }
    
    // 미니 캘린더 렌더링 함수
    function renderMiniCalendar(container, selectedDateStr) {
        container.innerHTML = '';
        
        if (!window.panoramaDates || window.panoramaDates.length === 0) {
            container.innerHTML = '<div style="color: white; padding: 10px;">사용 가능한 날짜 없음</div>';
            return;
        }
        
        // 날짜를 그룹화하여 표시
        const dateButtons = document.createElement('div');
        dateButtons.style.display = 'grid';
        dateButtons.style.gridTemplateColumns = 'repeat(3, 1fr)';
        dateButtons.style.gap = '5px';
        
        window.panoramaDates.forEach(dateInfo => {
            const dateButton = document.createElement('div');
            dateButton.textContent = dateInfo.date;
            dateButton.style.padding = '5px';
            dateButton.style.textAlign = 'center';
            dateButton.style.cursor = 'pointer';
            dateButton.style.borderRadius = '3px';
            dateButton.style.backgroundColor = dateInfo.date === selectedDateStr ? 
                                             'rgba(33, 150, 243, 0.7)' : 'rgba(50, 50, 50, 0.7)';
            
            dateButton.addEventListener('click', function() {
                dateStr = dateInfo.date; // 전역 dateStr 변수 업데이트
                changePanoramaDate(dateInfo.date);
                calendarContainer.style.display = 'none';
            });
            
            dateButtons.appendChild(dateButton);
        });
        
        container.appendChild(dateButtons);
    }
    
    // 이 뷰어만의 변수들
    const viewerState = {
        isUserInteracting: false,
        lon: 0,
        lat: 0,
        phi: 0,
        theta: 0,
        distance: 50,
        onPointerDownPointerX: 0,
        onPointerDownPointerY: 0,
        onPointerDownLon: 0,
        onPointerDownLat: 0,
        animationId: null
    };
    
    // 애니메이션 함수
    function animateViewer() {
        viewerState.animationId = requestAnimationFrame(animateViewer);
        
        // 자동 회전 제거 (아래 코드 주석 처리)
        // if (!viewerState.isUserInteracting) {
        //     viewerState.lon += 0.05;
        // }
        
        viewerState.lat = Math.max(-85, Math.min(85, viewerState.lat));
        viewerState.phi = THREE.MathUtils.degToRad(90 - viewerState.lat);
        viewerState.theta = THREE.MathUtils.degToRad(viewerState.lon);
        
        viewerCamera.target.x = Math.sin(viewerState.phi) * Math.cos(viewerState.theta);
        viewerCamera.target.y = Math.cos(viewerState.phi);
        viewerCamera.target.z = Math.sin(viewerState.phi) * Math.sin(viewerState.theta);
        
        viewerCamera.lookAt(viewerCamera.target);
        viewerRenderer.render(viewerScene, viewerCamera);
    }

    function startPanoramaInviewer(renderedDateStr, locationIndex, viewerIndex) {
        console.log(`startPanoramaInviewer 호출: renderedDateStr=${renderedDateStr}, locationIndex=${locationIndex}, viewerIndex=${viewerIndex}`);
        
        // 이전 애니메이션 프레임 취소 - 뷰어 인스턴스에서 관리하도록 수정
        if (panoramaView.viewerInstance && panoramaView.viewerInstance.animationId) {
            console.log(`이전 애니메이션 취소: ${panoramaView.viewerInstance.animationId}`);
            cancelAnimationFrame(panoramaView.viewerInstance.animationId);
            panoramaView.viewerInstance.animationId = null;
        }
        
        // 이전 씬 정리
        while (viewerScene.children.length > 0) {
            const object = viewerScene.children[0];
            viewerScene.remove(object);
            // 메모리 누수 방지를 위한 리소스 해제
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }
        
        // 변수 초기화
        const selectedDateStr = renderedDateStr;

        // 뷰어 인스턴스 초기화 또는 업데이트
        if (!panoramaView.viewerInstance) {
            panoramaView.viewerInstance = {
                dateStr: selectedDateStr,
                locationId: locationIndex,
                animationId: null,
                scene: viewerScene,
                camera: viewerCamera,
                renderer: viewerRenderer
            };
        } else {
            panoramaView.viewerInstance.dateStr = selectedDateStr;
            panoramaView.viewerInstance.locationId = locationIndex;
        }

        // JSON URL 찾기 - panorama.js와 정확히 동일한 방식 사용
        const target_dataURL = window.find_dataURL(renderedDateStr);
        if (!target_dataURL) {
            console.error(`날짜 ${renderedDateStr}에 대한 데이터 URL을 찾을 수 없습니다.`);
            return;
        }
        
        const fullDataURL = window.datesJsonUrl + target_dataURL;
        
        console.log(`${viewerIndex}번 뷰어의 날짜 변경 정보:`, { 
            renderedDateStr, 
            target_dataURL: fullDataURL,
            datesJsonUrl: window.datesJsonUrl,
        });

        parseConfigJSON(fullDataURL, function (panodata) {
            var loader = new LocationLoader();
            loader.loadLocation(panodata.startLocation, function(location) {           
                viewerScene.add(location);
                var cts = location.cameraTargets;
                lat = cts[-1].lat;
                lon = cts[-1].lon;
                lastPanoramaUID = location.uid;
                mapUid = location.mapUid;
                
                // 이 뷰어에 해당하는 맵 이미지만 업데이트
                updateMapForCurrentViewer(viewerIndex, panodata, location);
                
                if (typeof updateTargetList === 'function') {
                    try {
                        updateTargetList();
                    } catch (e) {
                        console.log("updateTargetList 함수 실행 중 오류:", e);
                    }
                }
                
                // 뷰어 정보 업데이트
                const infoLabel = panoramaView.querySelector('.viewer-info-label');
                if (infoLabel) {
                    infoLabel.textContent = `위치: ${location.uid}, 날짜: ${renderedDateStr}`;
                } 
            });
        });
        
        // 새 애니메이션 시작 - 뷰어 인스턴스에 저장
        function animateViewerInstance() {
            panoramaView.viewerInstance.animationId = requestAnimationFrame(animateViewerInstance);
            
            // 카메라 회전 로직
            viewerState.lat = Math.max(-85, Math.min(85, viewerState.lat));
            viewerState.phi = THREE.MathUtils.degToRad(90 - viewerState.lat);
            viewerState.theta = THREE.MathUtils.degToRad(viewerState.lon);
            
            viewerCamera.target.x = Math.sin(viewerState.phi) * Math.cos(viewerState.theta);
            viewerCamera.target.y = Math.cos(viewerState.phi);
            viewerCamera.target.z = Math.sin(viewerState.phi) * Math.sin(viewerState.theta);
            
            viewerCamera.lookAt(viewerCamera.target);
            viewerRenderer.render(viewerScene, viewerCamera);
        }
        animateViewer();
        // panoramaView.viewerInstance.animationId = requestAnimationFrame(animateViewerInstance);
    }

    function startPanoramaviewer() {
        // 현재 파노라마 데이터와 위치 정보 복제
        if (window.panoramaData && window.panoramaData.locations) {
            // 현재 위치 찾기
            const currentLoc = window.panoramaData.locations.find(loc => loc.uid === locationIndex);
            
            if (currentLoc) {
                // 이미지 URL 가져오기
                // const imgUrl = currentLoc.image.default;
                // const fullImgUrl = window.datesJsonUrl + imgUrl;
                
                // console.log(`${viewerIndex}번 뷰어 로딩: ${fullImgUrl}`);
                
                // JSON URL 찾기 - panorama.js와 정확히 동일한 방식 사용
                renderedDateStr = window.selectedDateStr;
                const target_dataURL = window.find_dataURL(renderedDateStr);
                if (!target_dataURL) {
                    console.error(`날짜 ${renderedDateStr}에 대한 데이터 URL을 찾을 수 없습니다.`);
                    return;
                }
                
                const fullDataURL = window.datesJsonUrl + target_dataURL;
                
                console.log(`${viewerIndex}번 뷰어의 날짜 변경 정보:`, { 
                    renderedDateStr, 
                    target_dataURL: fullDataURL,
                    datesJsonUrl: window.datesJsonUrl,
                });

                parseConfigJSON(fullDataURL, function (panodata) {
                    var loader = new LocationLoader();
                    loader.loadLocation(currentLoc.uid, function(location) {           
                        viewerScene.add(location);
                        var cts = location.cameraTargets;
                        lat = cts[-1].lat;
                        lon = cts[-1].lon;
                        lastPanoramaUID = location.uid;
                        lastPanoramaUID = currentLoc.uid
                        mapUid = location.mapUid;
                                                

                
                        // 이 뷰어에 해당하는 맵 이미지만 업데이트
                        updateMapForCurrentViewer(viewerIndex, panodata, location);
                        
                        if (typeof updateTargetList === 'function') {
                            try {
                                updateTargetList();
                            } catch (e) {
                                console.log("updateTargetList 함수 실행 중 오류:", e);
                            }
                        }
                        // 로딩 표시기 제거
                        loadingIndicator.style.display = 'none';
                        
                        // 뷰어 상태 업데이트
                        if (currentLoc.cameraTargets && currentLoc.cameraTargets[-1]) {
                            viewerState.lat = currentLoc.cameraTargets[-1].lat;
                            viewerState.lon = currentLoc.cameraTargets[-1].lon;
                        }
                        
                        // 이벤트 리스너 설정
                        function onViewerPointerDown(event) {
                            if (event.isPrimary === false) return;
                            
                            viewerState.isUserInteracting = true;
                            
                            viewerState.onPointerDownPointerX = event.clientX;
                            viewerState.onPointerDownPointerY = event.clientY;
                            
                            viewerState.onPointerDownLon = viewerState.lon;
                            viewerState.onPointerDownLat = viewerState.lat;
                        }
                        
                        function onViewerPointerMove(event) {
                            if (event.isPrimary === false) return;
                            
                            if (viewerState.isUserInteracting) {
                                viewerState.lon = (viewerState.onPointerDownPointerX - event.clientX) * 0.1 + viewerState.onPointerDownLon;
                                viewerState.lat = (event.clientY - viewerState.onPointerDownPointerY) * 0.1 + viewerState.onPointerDownLat;
                            }
                        }
                        
                        function onViewerPointerUp() {
                            viewerState.isUserInteracting = false;
                        }
                        
                        function onViewerWheel(event) {
                            viewerCamera.fov += event.deltaY * 0.05;
                            viewerCamera.fov = Math.max(30, Math.min(90, viewerCamera.fov));
                            viewerCamera.updateProjectionMatrix();
                        }

                        // 리사이즈 이벤트 리스너 추가
                        function handleViewerResize() {
                            viewerCamera.aspect = panoramaView.clientWidth / panoramaView.clientHeight;
                            viewerCamera.updateProjectionMatrix();
                            viewerRenderer.setSize(panoramaView.clientWidth, panoramaView.clientHeight);
                        }

                        // 이벤트 리스너 등록
                        panoramaView.addEventListener('pointerdown', onViewerPointerDown);
                        panoramaView.addEventListener('pointermove', onViewerPointerMove);
                        panoramaView.addEventListener('pointerup', onViewerPointerUp);
                        panoramaView.addEventListener('wheel', onViewerWheel);
                        
                        // 창 크기 변경 이벤트에 대응
                        window.addEventListener('resize', handleViewerResize);
                        
                        // 첫 번째 뷰어에 초기 구도 적용
                        viewerState.lat = window.multiViewInitialLat;
                        viewerState.lon = window.multiViewInitialLon;
                        
                        // 애니메이션 시작
                        animateViewer();
                        
                        // 뷰어 정보 표시
                        const infoLabel = document.createElement('div');
                        infoLabel.className = 'viewer-info-label';
                        infoLabel.style.position = 'absolute';
                        infoLabel.style.bottom = '50px'; // 날짜 내비게이션과 겹치지 않도록 조정
                        infoLabel.style.left = '50%';
                        infoLabel.style.transform = 'translateX(-50%)';
                        infoLabel.style.padding = '5px 10px';
                        infoLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                        infoLabel.style.color = 'white';
                        infoLabel.style.fontSize = '12px';
                        infoLabel.style.borderRadius = '4px';
                        infoLabel.style.textAlign = 'center'; // 텍스트 중앙 정렬
                        infoLabel.style.whiteSpace = 'nowrap'; // 텍스트 줄바꿈 방지
                        infoLabel.textContent = `위치: ${currentLoc.uid}, 날짜: ${dateStr}`;
                        panoramaView.appendChild(infoLabel);

                        // 뷰어 객체 저장
                        panoramaView.viewerInstance = {
                            scene: viewerScene,
                            camera: viewerCamera,
                            renderer: viewerRenderer,
                            state: viewerState,
                            locationId: currentLoc.uid,
                            dateStr: dateStr,
                            destroy: function() {
                                // 애니메이션 정지
                                if (viewerState.animationId) {
                                    cancelAnimationFrame(viewerState.animationId);
                                }
                                
                                // 이벤트 리스너 제거
                                panoramaView.removeEventListener('pointerdown', onViewerPointerDown);
                                panoramaView.removeEventListener('pointermove', onViewerPointerMove);
                                panoramaView.removeEventListener('pointerup', onViewerPointerUp);
                                panoramaView.removeEventListener('wheel', onViewerWheel);
                                window.removeEventListener('resize', handleViewerResize);
                                
                                // 렌더러 및 리소스 정리
                                viewerRenderer.dispose();
                                // if (mesh && mesh.geometry) mesh.geometry.dispose();
                                // if (material) material.dispose();
                                // if (texture) texture.dispose();
                                
                                // 요소 제거
                                while (panoramaView.firstChild) {
                                    panoramaView.removeChild(panoramaView.firstChild);
                                }
                            }
                        };
                    },
                    function(xhr) {
                        // 로딩 진행 상황
                        const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
                        loadingIndicator.innerHTML = `파노라마 로딩 중... ${progress}%`;
                    },
                    function(error) {
                        // 오류 발생
                        console.error(`파노라마 로딩 오류: ${error.message}`);
                        loadingIndicator.innerHTML = '파노라마 로딩 실패';
                        loadingIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
                    })


                    });




                // // 텍스처 로더 생성
                // const textureLoader = new THREE.TextureLoader();
                // textureLoader.load(
                //     fullImgUrl,
                //     function(texture) {
                //         // 로딩 완료
                //         // 구면 지오메트리 생성 및 텍스처 적용
                //         const geometry = new THREE.SphereGeometry(200, 50, 30);
                //         geometry.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
                        
                //         const material = new THREE.MeshBasicMaterial({
                //             map: texture
                //         });
                        
                //         const mesh = new THREE.Mesh(geometry, material);
                //         viewerScene.add(mesh);
                        
                //         // 로딩 표시기 제거
                //         loadingIndicator.style.display = 'none';
                        
                //         // 뷰어 상태 업데이트
                //         if (currentLoc.cameraTargets && currentLoc.cameraTargets[-1]) {
                //             viewerState.lat = currentLoc.cameraTargets[-1].lat;
                //             viewerState.lon = currentLoc.cameraTargets[-1].lon;
                //         }
                        
                //         // 이벤트 리스너 설정
                //         function onViewerPointerDown(event) {
                //             if (event.isPrimary === false) return;
                            
                //             viewerState.isUserInteracting = true;
                            
                //             viewerState.onPointerDownPointerX = event.clientX;
                //             viewerState.onPointerDownPointerY = event.clientY;
                            
                //             viewerState.onPointerDownLon = viewerState.lon;
                //             viewerState.onPointerDownLat = viewerState.lat;
                //         }
                        
                //         function onViewerPointerMove(event) {
                //             if (event.isPrimary === false) return;
                            
                //             if (viewerState.isUserInteracting) {
                //                 viewerState.lon = (viewerState.onPointerDownPointerX - event.clientX) * 0.1 + viewerState.onPointerDownLon;
                //                 viewerState.lat = (event.clientY - viewerState.onPointerDownPointerY) * 0.1 + viewerState.onPointerDownLat;
                //             }
                //         }
                        
                //         function onViewerPointerUp() {
                //             viewerState.isUserInteracting = false;
                //         }
                        
                //         function onViewerWheel(event) {
                //             viewerCamera.fov += event.deltaY * 0.05;
                //             viewerCamera.fov = Math.max(30, Math.min(90, viewerCamera.fov));
                //             viewerCamera.updateProjectionMatrix();
                //         }

                //         // 리사이즈 이벤트 리스너 추가
                //         function handleViewerResize() {
                //             viewerCamera.aspect = panoramaView.clientWidth / panoramaView.clientHeight;
                //             viewerCamera.updateProjectionMatrix();
                //             viewerRenderer.setSize(panoramaView.clientWidth, panoramaView.clientHeight);
                //         }

                //         // 이벤트 리스너 등록
                //         panoramaView.addEventListener('pointerdown', onViewerPointerDown);
                //         panoramaView.addEventListener('pointermove', onViewerPointerMove);
                //         panoramaView.addEventListener('pointerup', onViewerPointerUp);
                //         panoramaView.addEventListener('wheel', onViewerWheel);
                        
                //         // 창 크기 변경 이벤트에 대응
                //         window.addEventListener('resize', handleViewerResize);
                        
                //         // 애니메이션 시작
                //         animateViewer();
                        
                //         // 뷰어 정보 표시
                //         const infoLabel = document.createElement('div');
                //         infoLabel.className = 'viewer-info-label';
                //         infoLabel.style.position = 'absolute';
                //         infoLabel.style.bottom = '50px'; // 날짜 내비게이션과 겹치지 않도록 조정
                //         infoLabel.style.left = '50%';
                //         infoLabel.style.transform = 'translateX(-50%)';
                //         infoLabel.style.padding = '5px 10px';
                //         infoLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                //         infoLabel.style.color = 'white';
                //         infoLabel.style.fontSize = '12px';
                //         infoLabel.style.borderRadius = '4px';
                //         infoLabel.style.textAlign = 'center'; // 텍스트 중앙 정렬
                //         infoLabel.style.whiteSpace = 'nowrap'; // 텍스트 줄바꿈 방지
                //         infoLabel.textContent = `위치: ${currentLoc.uid}, 날짜: ${dateStr}`;
                //         panoramaView.appendChild(infoLabel);

                //         // 뷰어 객체 저장
                //         panoramaView.viewerInstance = {
                //             scene: viewerScene,
                //             camera: viewerCamera,
                //             renderer: viewerRenderer,
                //             state: viewerState,
                //             locationId: currentLoc.uid,
                //             dateStr: dateStr,
                //             destroy: function() {
                //                 // 애니메이션 정지
                //                 if (viewerState.animationId) {
                //                     cancelAnimationFrame(viewerState.animationId);
                //                 }
                                
                //                 // 이벤트 리스너 제거
                //                 panoramaView.removeEventListener('pointerdown', onViewerPointerDown);
                //                 panoramaView.removeEventListener('pointermove', onViewerPointerMove);
                //                 panoramaView.removeEventListener('pointerup', onViewerPointerUp);
                //                 panoramaView.removeEventListener('wheel', onViewerWheel);
                //                 window.removeEventListener('resize', handleViewerResize);
                                
                //                 // 렌더러 및 리소스 정리
                //                 viewerRenderer.dispose();
                //                 if (mesh && mesh.geometry) mesh.geometry.dispose();
                //                 if (material) material.dispose();
                //                 if (texture) texture.dispose();
                                
                //                 // 요소 제거
                //                 while (panoramaView.firstChild) {
                //                     panoramaView.removeChild(panoramaView.firstChild);
                //                 }
                //             }
                //         };
                //     },
                //     function(xhr) {
                //         // 로딩 진행 상황
                //         const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
                //         loadingIndicator.innerHTML = `파노라마 로딩 중... ${progress}%`;
                //     },
                //     function(error) {
                //         // 오류 발생
                //         console.error(`파노라마 로딩 오류: ${error.message}`);
                //         loadingIndicator.innerHTML = '파노라마 로딩 실패';
                //         loadingIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
                //     }
                // );
            } else {
                console.error(`${viewerIndex}번 뷰어 위치 정보 없음: ${locationIndex}`);
                loadingIndicator.innerHTML = '위치 정보 없음';
                loadingIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
            }
        } else {
            console.error(`${viewerIndex}번 뷰어 파노라마 데이터 없음`);
            loadingIndicator.innerHTML = '파노라마 데이터 없음';
            loadingIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        }
    }
    
    startPanoramaviewer();
}

// 그리드 레이아웃 업데이트
function updateGridLayout() {
    const multiViewGrid = document.getElementById('multiview-grid');
    const viewerContainers = multiViewGrid.querySelectorAll('.viewer-container');
    
    // 기존 스타일 제거
    viewerContainers.forEach(container => {
        container.style.width = '';
        container.style.height = '';
    });
    
    // 뷰어 개수에 따라 그리드 클래스 설정
    switch(viewCount) {
        case 1:
            multiViewGrid.className = 'grid-layout-single';
            break;
        case 2:
            multiViewGrid.className = 'grid-layout-two';
            break;
        case 3:
            multiViewGrid.className = 'grid-layout-three';
            break;
        case 4:
            multiViewGrid.className = 'grid-layout-four';
            break;
        default:
            multiViewGrid.className = 'grid-layout-single';
    }
    
    // 애니메이션 효과
    viewerContainers.forEach(container => {
        container.style.transition = 'all 0.3s ease-in-out';
    });
    
    // 레이아웃 변경 효과
    multiViewGrid.classList.add('layout-changing');
    setTimeout(() => {
        multiViewGrid.classList.remove('layout-changing');
    }, 300);
    
    // 각 뷰어 컨테이너에 애니메이션 효과 적용
    viewerContainers.forEach(container => {
        container.style.opacity = '0';
        setTimeout(() => {
            container.style.opacity = '1';
        }, 100);
    });
    
    // 모든 파노라마의 크기 업데이트
    setTimeout(() => {
        const panoramaViews = document.querySelectorAll('.panorama-view');
        panoramaViews.forEach(view => {
            // 파노라마 라이브러리가 있는 경우 리사이즈 이벤트 발생
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('resize'));
            }
        });
    }, 350);
    
    console.log(`그리드 레이아웃 업데이트: ${viewCount}개의 뷰어`);
}

// 뷰 제거
function removeView(index) {
    // 활성 뷰어 배열에서 해당 인덱스의 뷰어 찾기
    const viewIndex = activeViews.findIndex(view => view.index === index);
    
    if (viewIndex !== -1) {
        const view = activeViews[viewIndex];
        
        // 뷰어 리소스 정리
        const panoramaView = document.getElementById(`panorama-view-${index}`);
        if (panoramaView && panoramaView.viewerInstance) {
            // 뷰어 인스턴스의 destroy 메서드 호출
            panoramaView.viewerInstance.destroy();
            console.log(`${index}번 뷰어 리소스 정리 완료`);
        }
        
        // DOM에서 뷰어 컨테이너 제거
        view.container.remove();
        
        // 활성 뷰어 배열에서 제거
        activeViews.splice(viewIndex, 1);
        
        // 뷰 개수 감소 및 레이아웃 업데이트
        viewCount--;
        updateGridLayout();
        
        // 토스트 메시지 표시
        showToast(`${index}번 뷰어가 제거되었습니다.`);
    }
}

// 원래 파노라마 위치로 복원
function restoreMainPanorama() {
    // 첫 번째 뷰어에서 파노라마 꺼내기
    if (activeViews.length > 0) {
        const firstView = activeViews[0];
        
        // 모든 활성 뷰어의 리소스 정리 및 제거
        activeViews.forEach(view => {
            const panoramaView = document.getElementById(`panorama-view-${view.index}`);
            if (panoramaView && panoramaView.viewerInstance) {
                // 뷰어 인스턴스의 destroy 메서드 호출
                panoramaView.viewerInstance.destroy();
                console.log(`${view.index}번 뷰어 리소스 정리 완료`);
            }
            
            if (view.container) {
                view.container.remove();
            }
        });
        
        // 원래 파노라마 컨테이너를 원래 위치로 복원
        mainPanoramaContainer.style.display = 'block';
        
        // 배열 초기화
        activeViews = [];
        viewCount = 0;
        
        // 모든 파노라마 관련 상태 올바르게 초기화
        console.log("다중 뷰어 모드 상태 초기화");
        // 동기화 토글 초기화
        const syncViewsToggle = document.getElementById('sync-views-toggle');
        if (syncViewsToggle) {
            syncViewsToggle.checked = false;
            isSyncViewsEnabled = false;
        }
    }
    
    // 메인 뷰의 위치로 이동
    if (window.multiViewExitLat !== undefined && window.multiViewExitLon !== undefined) {
        window.lat = window.multiViewExitLat;
        window.lon = window.multiViewExitLon;
        // window.selectedDateStr = renderedDateStr;

        if (typeof window.startPanorama === 'function') {
            window.startPanorama(dateStr);
        }
       
        // console.log(`메인 파노라마로 복원 시 구도 적용: lat=${window.lat}, lon=${window.lon}`);
        // 카메라 업데이트를 위해 update 함수 호출
        // if (typeof window.update === 'function') {
        //     window.update();
        //     console.log("window.update 호출");
        // }
    }
}

// 뷰 동기화 함수
function synchronizeAllViews() {
    console.log('모든 뷰 동기화 시작');
    
    if (activeViews.length < 2) {
        console.log('동기화할 뷰가 충분하지 않습니다.');
        return;
    }
    
    // 메인 뷰어의 카메라 방향과 FOV 가져오기
    const mainView = document.getElementById('panorama-view-0');
    if (!mainView || !mainView.viewerInstance) {
        console.warn('메인 파노라마 인스턴스가 초기화되지 않았습니다.');
        return;
    }
    
    const mainState = mainView.viewerInstance.state;
    const mainCamera = mainView.viewerInstance.camera;
    
    // 동기화할 카메라 데이터
    const syncData = {
        lon: mainState.lon,
        lat: mainState.lat,
        fov: mainCamera.fov
    };
    
    console.log('동기화할 카메라 데이터:', syncData);
    
    // 맵 이미지 동기화 - 메인 뷰어의 맵을 다른 뷰에 적용
    // const mainMapImg = document.getElementById('mapImage-view-0');
    // if (mainMapImg && mainMapImg.src) {
    //     for (let i = 1; i < activeViews.length; i++) {
    //         const viewIndex = activeViews[i].index;
    //         const mapImg = document.getElementById(`mapImage-view-${viewIndex}`);
    //         if (mapImg) {
    //             mapImg.src = mainMapImg.src;
    //             console.log(`뷰어 ${viewIndex}의 맵 이미지를 메인 뷰어와 동기화했습니다.`);
    //         }
    //     }
    // }
    
    // 토스트 메시지로 사용자에게 알림
    showToast('모든 뷰가 메인 뷰와 동기화되었습니다.');
    
    // 각 뷰어에 동일한 상태 적용 (첫 번째 뷰 제외)
    for (let i = 1; i < activeViews.length; i++) {
        const viewIndex = activeViews[i].index;
        const viewElement = document.getElementById(`panorama-view-${viewIndex}`);
        
        if (viewElement && viewElement.viewerInstance) {
            const viewState = viewElement.viewerInstance.state;
            const viewCamera = viewElement.viewerInstance.camera;
            
            // 카메라 방향 및 FOV 동기화
            viewState.lon = syncData.lon;
            viewState.lat = syncData.lat;
            viewCamera.fov = syncData.fov;
            viewCamera.updateProjectionMatrix();
            
            console.log(`${viewIndex}번 뷰어 동기화 완료`);
        }
        
        // 동기화 애니메이션 효과
        const viewContainer = activeViews[i].container;
        viewContainer.style.transition = 'box-shadow 0.3s ease-in-out';
        viewContainer.style.boxShadow = '0 0 10px 2px rgba(33, 150, 243, 0.7)';
        
        setTimeout(() => {
            viewContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        }, 600);
    }
    
    // 이벤트 리스너 설정 - 메인 뷰어의 변경사항을 다른 뷰어에 반영
    if (isSyncViewsEnabled) {
        // 동기화 간격 (밀리초) - 너무 빈번한 업데이트 방지
        const syncInterval = 10;
        let lastSyncTime = 0;
        
        // 동기화 함수 - 메인 뷰의 상태를 다른 뷰에 적용
        function syncViewersWithMain() {
            if (!isSyncViewsEnabled) return;
            
            const now = Date.now();
            if (now - lastSyncTime < syncInterval) return;
            lastSyncTime = now;
            
            const mainView = document.getElementById('panorama-view-0');
            if (!mainView || !mainView.viewerInstance) return;
            
            const mainState = mainView.viewerInstance.state;
            const mainCamera = mainView.viewerInstance.camera;
            
            for (let i = 1; i < activeViews.length; i++) {
                const viewIndex = activeViews[i].index;
                const viewElement = document.getElementById(`panorama-view-${viewIndex}`);
                
                if (viewElement && viewElement.viewerInstance) {
                    const viewState = viewElement.viewerInstance.state;
                    const viewCamera = viewElement.viewerInstance.camera;
                    
                    // 카메라 방향 및 FOV 동기화
                    viewState.lon = mainState.lon;
                    viewState.lat = mainState.lat;
                    viewCamera.fov = mainCamera.fov;
                    viewCamera.updateProjectionMatrix();
                }
            }
        }
        
        // 동기화 타이머 설정
        if (window.viewSyncInterval) {
            clearInterval(window.viewSyncInterval);
        }
        window.viewSyncInterval = setInterval(syncViewersWithMain, syncInterval);
    }
}

// 뷰 동기화 해제 함수
function desynchronizeViews() {
    console.log('뷰 동기화 해제');
    
    // 동기화 타이머 중지
    if (window.viewSyncInterval) {
        clearInterval(window.viewSyncInterval);
        window.viewSyncInterval = null;
    }
    
    // 토스트 메시지로 사용자에게 알림
    showToast('뷰 동기화가 해제되었습니다. 각 뷰어는 독립적으로 제어할 수 있으며, 맵 이미지도 개별적으로 업데이트됩니다.');
}

// 페이지 로드 시 다중 뷰어 초기화
window.addEventListener('load', function() {
    // 초기화 상태 확인 후 한 번만 초기화
    if (!isInitialized) {
        console.log("window.load 이벤트에서 다중 뷰어 초기화");
        setTimeout(initMultiView, 1000);
    }
});

// 전역 변수 및 함수 내보내기
window.initMultiView = initMultiView;
window.toggleMultiViewMode = function() {
    document.getElementById('multiview-toggle').click();
};

// 토스트 메시지 표시 함수
function showToast(message, duration = 3000) {
    // 기존 토스트 메시지가 있으면 제거
    const existingToast = document.querySelector('.multiview-toast');
    if (existingToast) {
        existingToast.parentNode.removeChild(existingToast);
    }
    
    // 새 토스트 메시지 생성
    const toast = document.createElement('div');
    toast.className = 'multiview-toast';
    toast.textContent = message;
    
    // 토스트 스타일 설정
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
    toast.style.color = 'white';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '10000';
    toast.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '500';
    
    // 애니메이션 효과
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease-in-out';
    
    // panorama 컨테이너에 토스트 메시지 추가 (body 대신)
    const container = document.getElementById('panorama') || document.body;
    container.appendChild(toast);
    
    console.log("토스트 메시지 표시:", message);
    
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);
    
    // 지정된 시간 후 사라짐
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// 파노라마 맵 좌표에 기반한 위치 이동 함수
window.moveToLocationByCoords = function(x, y) {
    console.log(`moveToLocationByCoords 호출: x=${x.toFixed(2)}, y=${y.toFixed(2)}`);
    
    // panorama.js의 위치 이동 함수와 연동
    if (typeof window.transitToLocation === 'function') {
        // 좌표를 기반으로 가장 가까운 위치 찾기
        const locationIndex = findNearestLocationByCoords(x, y);
        if (locationIndex !== -1) {
            // 위치 전환
            console.log(`좌표(${x.toFixed(2)}, ${y.toFixed(2)})에 가장 가까운 위치(${locationIndex})로 전환`);
            window.transitToLocation(locationIndex, true);
            return true;
        }
    }
    
    return false;
};

// 좌표에 기반하여 가장 가까운 위치 찾기
function findNearestLocationByCoords(x, y) {
    // panorama.js의 locations 배열 접근
    if (typeof window.locations !== 'undefined' && Array.isArray(window.locations)) {
        let nearestIndex = -1;
        let minDistance = Infinity;
        
        // 모든 위치를 순회하며 가장 가까운 위치 찾기
        for (let i = 0; i < window.locations.length; i++) {
            const location = window.locations[i];
            if (location && typeof location.mapSpot !== 'undefined') {
                // mapSpot 정보가 있는 경우
                const spotX = location.mapSpot.x || 0;
                const spotY = location.mapSpot.y || 0;
                
                // 유클리드 거리 계산
                const distance = Math.sqrt(Math.pow(x - spotX, 2) + Math.pow(y - spotY, 2));
                
                // 더 가까운 위치면 업데이트
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestIndex = i;
                }
            }
        }
        
        return nearestIndex;
    }
    
    return -1;
}

// 원본 맵 스팟 업데이트 감지 및 다중 뷰어 맵 동기화
function setupMapSpotSync() {
    // 원본 맵 스팟 컨테이너
    const originalMapContainer = document.getElementById('mapContainer');
    if (!originalMapContainer) return;
    
    // MutationObserver 설정
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // 새로운 스팟이 추가되었을 수 있음
                const spots = originalMapContainer.querySelectorAll('.map-spot');
                if (spots.length > 0) {
                    updateMultiViewSpots();
                }
            }
        });
    });
    
    // 스팟 업데이트를 감지하기 위한 설정
    observer.observe(originalMapContainer, { childList: true, subtree: true });
}

// 다중 뷰어의 모든 맵 스팟 업데이트
function updateMultiViewSpots() {
    // 원본 맵 스팟 정보 가져오기
    const originalSpot = document.querySelector('#mapContainer .map-spot');
    if (!originalSpot) return;
    
    const originalMapImg = document.getElementById('mapImage');
    if (!originalMapImg) return;
    
    const rect = originalMapImg.getBoundingClientRect();
    const spotRect = originalSpot.getBoundingClientRect();
    
    // 스팟의 상대적 위치 계산
    const x = (spotRect.left + spotRect.width/2 - rect.left) / rect.width;
    const y = (spotRect.top + spotRect.height/2 - rect.top) / rect.height;
    
    // 다중 뷰어 모드가 활성화된 경우에만 업데이트
    if (isMultiViewMode) {
        // 모든 뷰의 스팟 업데이트
        for (let i = 0; i < activeViews.length; i++) {
            const spotContainer = document.getElementById(`spot-container-view-${i}`);
            if (spotContainer) {
                updateSpotPosition(spotContainer, x, y);
            }
        }
    }
}

// 다중 뷰어 모드 UI 초기화 완료 후 맵 스팟 동기화 설정
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        setupMapSpotSync();
    }, 2000); // 충분한 시간을 두고 초기화
});

// 현재 뷰어의 맵만 업데이트하는 함수
function updateMapForCurrentViewer(viewerIdx, data, location) {
    console.log(`뷰어 ${viewerIdx}의 맵만 업데이트합니다.`);
    
    const mapContainer = document.getElementById(`mapContainer-view-${viewerIdx}`);
    if (!mapContainer) {
        console.log(`맵 컨테이너를 찾을 수 없음: mapContainer-view-${viewerIdx}`);
        return;
    }
    
    const mapImg = document.getElementById(`mapImage-view-${viewerIdx}`);
    if (!mapImg) {
        console.log(`맵 이미지를 찾을 수 없음: mapImage-view-${viewerIdx}`);
        return;
    }
    
    // 해당 위치의 맵 찾기
    let matchingMap = null;
    
    // 위치에 맵ID가 있는 경우
    if (location.mapUid && data.maps) {
        matchingMap = data.maps.find(map => map.uid === location.mapUid);
    }
    
    if (matchingMap && matchingMap.image) {
        // 맵 이미지 업데이트
        const fullMapUrl = window.datesJsonUrl + matchingMap.image;
        console.log(`뷰어 ${viewerIdx}의 맵 이미지 업데이트: ${fullMapUrl}`);
        mapImg.src = fullMapUrl;
        
        // 스팟 위치 업데이트
        const spotContainer = document.getElementById(`spot-container-view-${viewerIdx}`);
        if (spotContainer && location.mapSpot) {
            updateSpotPosition(spotContainer, location.mapSpot.x, location.mapSpot.y);
        }
    } else {
        console.log(`위치 ${location.uid}에 대한 맵을 찾을 수 없습니다.`);
    }
} 