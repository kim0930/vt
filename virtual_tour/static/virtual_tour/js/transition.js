/**
 * Describes a clickable object in a location that allows users to navigate between locations.
 * @param {Object} parameters Object with fields: panoImg, targetLocation, tooltip, position, etc.
 * @constructor
 */


class Transition extends THREE.Mesh {
    constructor(parameters = {}) {
		const hotspotGeometry = new THREE.SphereGeometry(15, 15, 15);
		const hotspotTexture = new THREE.TextureLoader().load(parameters.targetLocation_image);
		const hotspotMaterial = new THREE.MeshBasicMaterial({ map: hotspotTexture, side: THREE.FrontSide });
		
		super(hotspotGeometry, hotspotMaterial);
		
        this.position.set(parameters.position.x, parameters.position.y, parameters.position.z);
		
		// userData에 targetLocation 정보 추가 (다중 뷰어에서 인식하기 위함)
		this.userData = { 
            target: parameters.targetLocation,
            targetLocation: parameters.targetLocation,
            isClickable: true
        };
		
		this.panoImg = parameters.panoImg || "";
        this.targetLocation = parameters.targetLocation ?? -1;
        this.tooltip = parameters.tooltip || null;
        
        // 마우스 오버 효과를 위한 원래 색상 저장
        this.originalColor = this.material.color.clone();
    };
	
    // 마우스가 전환점 위에 올라갔을 때 호출됨
    onMouseOver() {
        try {
            // 원본 색상 저장 (아직 저장되지 않은 경우)
            if (!this.originalColor) {
                this.originalColor = this.material.color.clone();
            }
            
            // 색상을 밝은 하이라이트 색상으로 변경 (하늘색 계열)
            this.material.color.set(0x00ccff); // 밝은 하늘색
            
            console.log(`Transition ${this.targetLocation} 위에 마우스 오버됨`);
        } catch (error) {
            console.error('마우스 오버 효과 적용 중 오류:', error);
        }
    }
    
    // 마우스가 전환점에서 벗어났을 때 호출됨
    onMouseOut() {
        try {
            // 원래 색상으로 복원
            if (this.originalColor) {
                this.material.color.copy(this.originalColor);
            }
            
            console.log(`Transition ${this.targetLocation}에서 마우스 아웃됨`);
        } catch (error) {
            console.error('마우스 아웃 효과 적용 중 오류:', error);
        }
    }

    onClick(event) {
        try {
            if (this.targetLocation > -1) {
                console.log(`Transition onClick: Navigating to location: ${this.targetLocation}`);
                
                // 이벤트 로깅 (방어적 코딩)
                if (event && typeof event === 'object') {
                    // 객체 형태의 유효한 이벤트가 있는 경우
                    console.log('이벤트 정보:', {
                        type: event.type || 'unknown',
                        target: event.target ? (event.target.id || 'anonymous') : 'none',
                        position: event.clientX !== undefined ? [event.clientX, event.clientY] : 'unknown'
                    });
                } else {
                    console.log('이벤트 객체가 정의되지 않음 (일반 모드)');
                }
                
                // 다중 뷰어 모드 감지
                const isMultiViewMode = window.isMultiViewMode === true;
                console.log(`현재 모드: ${isMultiViewMode ? '다중 뷰어' : '일반 모드'}`);
                
                // 전환 실행
                if (typeof window.transitToLocation === 'function') {
                    try {
                        window.transitToLocation(this.targetLocation);
                        console.log(`transitToLocation(${this.targetLocation}) 호출 성공`);
                    } catch (err) {
                        console.error(`transitToLocation 호출 중 오류:`, err);
                    }
                } else {
                    console.error("transitToLocation 함수를 찾을 수 없습니다.");
                    
                    // 다중 뷰어 모드를 위한 커스텀 이벤트 발생
                    if (isMultiViewMode) {
                        try {
                            const transitionEvent = new CustomEvent('locationTransition', {
                                detail: { 
                                    targetLocation: this.targetLocation,
                                    time: Date.now()
                                }
                            });
                            window.dispatchEvent(transitionEvent);
                            console.log(`locationTransition 이벤트 발생: ${this.targetLocation}`);
                        } catch (eventError) {
                            console.error('커스텀 이벤트 생성 중 오류:', eventError);
                        }
                    }
                }
            } else {
                console.error("targetLocation이 지정되지 않았습니다!");
            }
        } catch (generalError) {
            // 모든 예외 상황 처리
            console.error("Transition.onClick 실행 중 일반 오류:", generalError);
        }
    }
}

// 전역 스코프에 Transition 클래스 노출
window.Transition = Transition;




/**
class Transition extends THREE.Mesh {
    constructor(parameters = {}) {
        var geometry = new THREE.PlaneGeometry(15, 15);
        var material = new THREE.MeshBasicMaterial({
            map: new THREE.TextureLoader().load("resources/icons/transfer.png"),
            transparent: true
        });

        super(geometry, material);
		
        this.panoImg = parameters.panoImg || "";
        this.targetLocation = parameters.targetLocation ?? -1;
        this.tooltip = parameters.tooltip || null;

        this.position.set(parameters.position.x, parameters.position.y, parameters.position.z);

        // Ŭ�� �̺�Ʈ�� ���� userData ����
        this.userData.isClickable = true;
    };
	

    onClick(event) {
        if (this.targetLocation > -1) {
            console.log(`Navigating to location: ${this.targetLocation}`);
            transitToLocation(this.targetLocation);
        } else {
            console.log("error: targetLocation not specified!!!");
        }
    }
}
*/