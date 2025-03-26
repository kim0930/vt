// Memo.js - Handles the creation, display, and management of memos in panorama view
// Memo data structure and global variables
let memos = {};
let currentMemos = [];
let activeMemo = null;
let isMemoMode = false;
let memoCounter = 0;
let currentUser = "Anonymous"; // This should be updated with actual user info
let mouseDownStartTime = 0; // Track when mouse down started
let mouseDownPosition = { x: 0, y: 0 }; // Track where mouse down started
let isMouseDown = false; // Track if mouse is down
let hoveredMemo = null; // Track which memo is currently being hovered
let lastMousePosition = { x: 0, y: 0 }; // Track mouse position for hover detection
let hoverTimeout = null; // Timeout for hover detection

// Memo types with corresponding icons
const MEMO_TYPES = {
    "important": {
        icon: "��",  // ��ǥ
        color: "#ff5252"
    },
    "completed": {
        icon: "?",  // üũ��ũ
        color: "#4caf50"
    },
    "needsCheck": {
        icon: "?",  // ���
        color: "#ff9800"
    },
    "other": {
        icon: "?",  // ����
        color: "#2196f3"
    }
};

// Initialize the memo system
function initMemoSystem() {
    console.log("Initializing memo system...");
    
    // Wait for scene to be initialized
    if (!window.scene) {
        console.log("Waiting for scene to be initialized...");
        setTimeout(initMemoSystem, 100);
        return;
    }
    
    // Create memo UI elements
    createMemoUI();
    
    // Initialize event listeners
    initMemoEventListeners();
    
    // Load memos for the current location and date
    loadMemosForCurrentView();
    
    // Initialize measure mode button change listener
    const measureModeExitBtn = document.getElementById('measureModeExitBtn');
    const measureModeBtn = document.getElementById('measureModeBtn');
    
    // Set up a MutationObserver to watch for display changes on measureModeExitBtn
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'style') {
                if (measureModeExitBtn.style.display === 'block') {
                    // Measure mode is active, hide memo button
                    document.getElementById('memoModeBtn').style.display = 'none';
                } else {
                    // Measure mode is inactive, show memo button if not in memo mode
                    if (!isMemoMode) {
                        document.getElementById('memoModeBtn').style.display = 'block';
                    }
                }
            }
        });
    });
    
    // Start observing the measureModeExitBtn for display changes
    if (measureModeExitBtn) {
        observer.observe(measureModeExitBtn, { attributes: true });
    }
    
    // Also add a click listener to measureModeBtn to hide memoModeBtn
    if (measureModeBtn) {
        measureModeBtn.addEventListener('click', function() {
            document.getElementById('memoModeBtn').style.display = 'none';
        });
    }
    
    // We no longer need global click listener as we'll handle it in mouseup
    // window.addEventListener('click', handleMemoClick);
}

// Handle memo sprite clicks
function handleMemoClick(event) {
    if (isMemoMode) return; // Don't handle clicks in memo mode
    
    const panorama = document.getElementById('panorama');
    const rect = panorama.getBoundingClientRect();
    
    // Convert mouse coordinates to normalized device coordinates (-1 to +1)
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Create raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), window.camera);
    
    // Get all memo sprites
    const sprites = currentMemos.map(memo => memo.sprite).filter(sprite => sprite);
    
    // Check for intersections
    const intersects = raycaster.intersectObjects(sprites, true);
    
    if (intersects.length > 0) {
        // Find the corresponding memo
        const clickedSprite = intersects[0].object;
        const clickedMemo = currentMemos.find(memo => memo.sprite === clickedSprite);
        
        if (clickedMemo) {
            event.stopPropagation();
            event.preventDefault();
            
            // If memo form is visible, hide it
            const memoForm = document.getElementById('memoForm');
            if (memoForm.style.display === 'block') {
                memoForm.style.display = 'none';
                return;
            }
            
            // Get the memo view for this specific memo
            const memoViewId = `memoView_${clickedMemo.id}`;
            const existingMemoView = document.getElementById(memoViewId);
            
            if (existingMemoView) {
                // Toggle visibility
                if (existingMemoView.style.display === 'none') {
                    existingMemoView.style.display = 'block';
                    activeMemo = clickedMemo;
                } else {
                    existingMemoView.style.display = 'none';
                    if (activeMemo && activeMemo.id === clickedMemo.id) {
                        activeMemo = null;
                    }
                }
            } else {
                // Create new memo view
                showMemoDetails(clickedMemo);
            }
        }
    }
}

// Create UI elements for memo functionality
function createMemoUI() {
    // Create memo mode toggle button
    const modeContainer = document.getElementById('mode-Container');
    
    const memoModeBtn = document.createElement('div');
    memoModeBtn.id = 'memoModeBtn';
    memoModeBtn.innerHTML = '📝';
    memoModeBtn.style.cursor = 'pointer';
    memoModeBtn.style.padding = '5px';
    memoModeBtn.style.transition = 'all 0.3s ease';
    memoModeBtn.title = 'Enter Memo Mode';
    memoModeBtn.onclick = toggleMemoMode;
    
    const memoModeExitBtn = document.createElement('div');
    memoModeExitBtn.id = 'memoModeExitBtn';
    memoModeExitBtn.innerHTML = '📝';
    memoModeExitBtn.style.display = 'none';
    memoModeExitBtn.style.backgroundColor = 'rgba(33, 150, 243, 0.3)';
    memoModeExitBtn.style.padding = '5px';
    memoModeExitBtn.style.borderRadius = '5px';
    memoModeExitBtn.style.boxShadow = '0 0 10px rgba(33, 150, 243, 0.5)';
    memoModeExitBtn.style.cursor = 'pointer';
    memoModeExitBtn.style.transition = 'all 0.3s ease';
    memoModeExitBtn.title = 'Exit Memo Mode';
    memoModeExitBtn.onclick = exitMemoMode;
    
    modeContainer.appendChild(memoModeBtn);
    modeContainer.appendChild(memoModeExitBtn);
    
    // Create memo creation form
    const memoForm = document.createElement('div');
    memoForm.id = 'memoForm';
    memoForm.style.display = 'none';
    memoForm.style.position = 'absolute';
    memoForm.style.width = '300px';
    memoForm.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    memoForm.style.color = 'white';
    memoForm.style.padding = '15px';
    memoForm.style.borderRadius = '8px';
    memoForm.style.zIndex = '1000';
    memoForm.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    memoForm.innerHTML = `
        <h3 style="margin-top: 0; color: #2196f3;">Create Memo</h3>
        <textarea id="memoContent" placeholder="Enter your memo here..." style="width: 100%; height: 80px; margin-bottom: 10px; background: rgba(255, 255, 255, 0.9); border: none; padding: 8px; border-radius: 4px;"></textarea>
        <div style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 5px;">Memo Type:</label>
            <div style="display: flex; justify-content: space-between;">
                <label style="cursor: pointer;">
                    <input type="radio" name="memoType" value="important" checked> 
                    <span style="font-family: 'Segoe UI Symbol', 'Arial Unicode MS', sans-serif;">�� Important</span>
                </label>
                <label style="cursor: pointer;">
                    <input type="radio" name="memoType" value="completed"> 
                    <span style="font-family: 'Segoe UI Symbol', 'Arial Unicode MS', sans-serif;">? Completed</span>
                </label>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                <label style="cursor: pointer;">
                    <input type="radio" name="memoType" value="needsCheck"> 
                    <span style="font-family: 'Segoe UI Symbol', 'Arial Unicode MS', sans-serif;">? Check Needed</span>
                </label>
                <label style="cursor: pointer;">
                    <input type="radio" name="memoType" value="other"> 
                    <span style="font-family: 'Segoe UI Symbol', 'Arial Unicode MS', sans-serif;">? Other</span>
                </label>
            </div>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <button id="saveMemoBtn" style="background: #4caf50; border: none; color: white; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Save</button>
            <button id="cancelMemoBtn" style="background: #f44336; border: none; color: white; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Cancel</button>
        </div>
    `;
    
    document.getElementById('panorama').appendChild(memoForm);
    
    // Create memo view container
    const memoView = document.createElement('div');
    memoView.id = 'memoView';
    memoView.style.display = 'none';
    memoView.style.position = 'absolute';
    memoView.style.width = '350px';
    memoView.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    memoView.style.color = 'white';
    memoView.style.padding = '15px';
    memoView.style.borderRadius = '8px';
    memoView.style.zIndex = '1000';
    memoView.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    memoView.style.maxHeight = '400px';
    memoView.style.overflowY = 'auto';
    
    document.getElementById('panorama').appendChild(memoView);
}

// Initialize event listeners for memo functionality
function initMemoEventListeners() {
    // No longer add global listeners here, we'll add them when showing the form
    // document.getElementById('saveMemoBtn').addEventListener('click', saveMemo);
    
    // Add listener for cancel button in memo form
    document.getElementById('cancelMemoBtn').addEventListener('click', cancelMemoCreation);
    
    // Add panorama mouse event listeners for memo creation
    const panorama = document.getElementById('panorama');
    const memoForm = document.getElementById('memoForm');
    const memoContent = document.getElementById('memoContent');
    
    // Add mouse move listener for hover detection
    panorama.addEventListener('mousemove', handleMouseMove);
    
    // Track if we're handling a click or a drag
    let isClick = true;
    let clickedMemoSprite = null;
    
    // Prevent form from closing when clicking inside it
    memoForm.addEventListener('mousedown', function(event) {
        event.stopPropagation();
    });
    
    // Prevent form from closing when clicking on the textarea
    memoContent.addEventListener('mousedown', function(event) {
        event.stopPropagation();
        event.target.focus(); // Ensure textarea gets focus
    });
    
    // Add click event listener to the form container to handle clicks outside textarea
    memoForm.addEventListener('click', function(event) {
        // If clicking outside the textarea, focus the textarea
        if (event.target !== memoContent) {
            memoContent.focus();
        }
        event.stopPropagation();
    });
    
    // Mouse down event
    panorama.addEventListener('mousedown', function(event) {
        isClick = true;
        clickedMemoSprite = null;
        
        if (!isMemoMode) {
            // When not in memo mode, check for sprite clicks
            const rect = panorama.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(x, y), window.camera);
            
            // Get all memo sprites
            const sprites = currentMemos.map(memo => memo.sprite).filter(sprite => sprite);
            
            // Check for intersections
            const intersects = raycaster.intersectObjects(sprites);
            
            if (intersects.length > 0) {
                // Find the corresponding memo
                const clickedSprite = intersects[0].object;
                clickedMemoSprite = currentMemos.find(memo => memo.sprite === clickedSprite);
                
                if (clickedMemoSprite) {
                    event.stopPropagation();
                    // We'll handle the actual click in mouseup to differentiate
                    // between click and drag
                    return;
                }
            }
        }
        
        // Rest of the existing mousedown code for memo creation
        if (!isMemoMode) return;
        
        // Ignore clicks on UI elements
        if (event.target.closest('#memoForm') || 
            event.target.closest('.memo-view') || 
            event.target.closest('#memoModeBtn') || 
            event.target.closest('#memoModeExitBtn') ||
            event.target.closest('#navigationButtonsContainer') ||
            event.target.closest('#mapContainer')) {
            return;
        }
        
        // Record the start time and position for the click
        mouseDownStartTime = Date.now();
        mouseDownPosition = { x: event.clientX, y: event.clientY };
        isMouseDown = true;
    });
    
    // Mouse move event to detect drag
    panorama.addEventListener('mousemove', function(event) {
        if (!isMouseDown) return;
        
        // Check if we've moved enough to consider this a drag
        const distanceMoved = Math.hypot(
            event.clientX - mouseDownPosition.x,
            event.clientY - mouseDownPosition.y
        );
        
        if (distanceMoved > 5) {
            isClick = false; // It's a drag, not a click
        }
    });
    
    // Mouse up event
    panorama.addEventListener('mouseup', function(event) {
        // If we have a clicked memo sprite and this is still a click (not a drag)
        if (clickedMemoSprite && isClick) {
            // If memo form is visible, hide it
            const memoForm = document.getElementById('memoForm');
            if (memoForm.style.display === 'block') {
                memoForm.style.display = 'none';
                isMouseDown = false;
                return;
            }
            
            // Handle memo sprite click - toggle detail view
            const memoViewId = `memoView_${clickedMemoSprite.id}`;
            const existingMemoView = document.getElementById(memoViewId);
            
            if (existingMemoView) {
                // Toggle visibility
                if (existingMemoView.style.display === 'none') {
                    existingMemoView.style.display = 'block';
                    activeMemo = clickedMemoSprite;
                } else {
                    existingMemoView.style.display = 'none';
                    if (activeMemo && activeMemo.id === clickedMemoSprite.id) {
                        activeMemo = null;
                    }
                }
            } else {
                // Create new memo view
                showMemoDetails(clickedMemoSprite);
            }
            
            isMouseDown = false;
            return;
        }
        
        // Handle memo creation in memo mode
        if (!isMemoMode || !isMouseDown) {
            isMouseDown = false;
            return;
        }
        
        // Calculate the distance moved and time elapsed
        const timeElapsed = Date.now() - mouseDownStartTime;
        const distanceMoved = Math.hypot(
            event.clientX - mouseDownPosition.x,
            event.clientY - mouseDownPosition.y
        );
        
        // If it was a short click (not a drag), show the memo form
        if (timeElapsed < 300 && distanceMoved < 10) {
            // Get position for the memo
            const rect = panorama.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Store absolute screen coordinates (for fixed position)
            const screenX = event.clientX;
            const screenY = event.clientY;
            
            // Show memo form at click position
            showMemoForm(x, y, screenX, screenY);
        }
        
        isMouseDown = false;
    });
    
    // Add touch event listeners for mobile
    panorama.addEventListener('touchstart', function(event) {
        isClick = true;
        clickedMemoSprite = null;
        
        if (!isMemoMode) {
            // When not in memo mode, check for sprite taps
            const rect = panorama.getBoundingClientRect();
            const touch = event.touches[0];
            const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
            
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(x, y), window.camera);
            
            // Get all memo sprites
            const sprites = currentMemos.map(memo => memo.sprite).filter(sprite => sprite);
            
            // Check for intersections
            const intersects = raycaster.intersectObjects(sprites);
            
            if (intersects.length > 0) {
                // Find the corresponding memo
                const clickedSprite = intersects[0].object;
                clickedMemoSprite = currentMemos.find(memo => memo.sprite === clickedSprite);
                
                if (clickedMemoSprite) {
                    event.stopPropagation();
                    // We'll handle the actual tap in touchend
                    mouseDownStartTime = Date.now();
                    mouseDownPosition = { x: touch.clientX, y: touch.clientY };
                    isMouseDown = true;
                    return;
                }
            }
        }
        
        if (!isMemoMode) return;
        
        // Ignore touches on UI elements
        if (event.target.closest('#memoForm') || 
            event.target.closest('.memo-view') || 
            event.target.closest('#memoModeBtn') || 
            event.target.closest('#memoModeExitBtn') ||
            event.target.closest('#navigationButtonsContainer') ||
            event.target.closest('#mapContainer') ||
            event.target.closest('.memo-icon')) {
            return;
        }
        
        // Record the start time and position for the touch
        mouseDownStartTime = Date.now();
        mouseDownPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        isMouseDown = true;
    });
    
    // Touch move event to detect drag
    panorama.addEventListener('touchmove', function(event) {
        if (!isMouseDown) return;
        
        // Check if we've moved enough to consider this a drag
        const touch = event.touches[0];
        const distanceMoved = Math.hypot(
            touch.clientX - mouseDownPosition.x,
            touch.clientY - mouseDownPosition.y
        );
        
        if (distanceMoved > 5) {
            isClick = false; // It's a drag, not a tap
        }
    });
    
    // Touch end event
    panorama.addEventListener('touchend', function(event) {
        // If we have a clicked memo sprite and this is still a tap (not a drag)
        if (clickedMemoSprite && isClick) {
            // If memo form is visible, hide it
            const memoForm = document.getElementById('memoForm');
            if (memoForm.style.display === 'block') {
                memoForm.style.display = 'none';
                isMouseDown = false;
                return;
            }
            
            // Handle memo sprite tap - toggle detail view
            const memoViewId = `memoView_${clickedMemoSprite.id}`;
            const existingMemoView = document.getElementById(memoViewId);
            
            if (existingMemoView) {
                // Toggle visibility
                if (existingMemoView.style.display === 'none') {
                    existingMemoView.style.display = 'block';
                    activeMemo = clickedMemoSprite;
                } else {
                    existingMemoView.style.display = 'none';
                    if (activeMemo && activeMemo.id === clickedMemoSprite.id) {
                        activeMemo = null;
                    }
                }
            } else {
                // Create new memo view
                showMemoDetails(clickedMemoSprite);
            }
            
            isMouseDown = false;
            return;
        }
        
        if (!isMemoMode || !isMouseDown) {
            isMouseDown = false;
            return;
        }
        
        // Calculate the distance moved and time elapsed
        const timeElapsed = Date.now() - mouseDownStartTime;
        
        // If it was a short tap (not a drag), show the memo form
        if (timeElapsed < 300 && isClick) {
            // Get position for the memo
            const rect = panorama.getBoundingClientRect();
            const x = mouseDownPosition.x - rect.left;
            const y = mouseDownPosition.y - rect.top;
            
            // Store absolute screen coordinates (for fixed position)
            const screenX = mouseDownPosition.x;
            const screenY = mouseDownPosition.y;
            
            // Show memo form at touch position
            showMemoForm(x, y, screenX, screenY);
        }
        
        isMouseDown = false;
    });
}

// Toggle memo mode on/off
function toggleMemoMode() {
    isMemoMode = !isMemoMode;
    
    if (isMemoMode) {
        // Enter memo mode
        document.getElementById('memoModeBtn').style.display = 'none';
        document.getElementById('memoModeExitBtn').style.display = 'block';
        document.body.style.cursor = 'crosshair';
        
        // If measure mode is active, exit it
        if (typeof window.exitMeasureMode === 'function' && document.getElementById('measureModeExitBtn').style.display === 'block') {
            window.exitMeasureMode();
        }
        
        // Removed the alert popup
    } else {
        // Exit memo mode
        exitMemoMode();
    }
}

// Exit memo mode
function exitMemoMode() {
    isMemoMode = false;
    document.getElementById('memoModeExitBtn').style.display = 'none';
    document.getElementById('memoModeBtn').style.display = 'block';
    document.body.style.cursor = 'auto';
    
    // Hide the memo form if it's visible
    document.getElementById('memoForm').style.display = 'none';
}

// Show memo creation form
function showMemoForm(x, y, screenX, screenY) {
    const memoForm = document.getElementById('memoForm');
    
    // Position the form
    memoForm.style.position = 'fixed';
    memoForm.style.left = screenX + 'px';
    memoForm.style.top = (screenY + 20) + 'px';
    
    // Convert screen coordinates to normalized device coordinates
    const normalizedX = (screenX / window.innerWidth) * 2 - 1;
    const normalizedY = -(screenY / window.innerHeight) * 2 + 1;
    
    // Create 3D vector and unproject
    const vector = new THREE.Vector3(normalizedX, normalizedY, 0.5);
    vector.unproject(window.camera);
    
    // Get the direction from camera to the point
    const direction = vector.sub(window.camera.position).normalize();
    
    // Calculate the point on the sphere (radius 195 to match measurement system)
    const spherePoint = direction.multiplyScalar(195);
    
    // Store 3D coordinates in data attributes
    memoForm.dataset.vector3D = JSON.stringify({
        x: spherePoint.x,
        y: spherePoint.y,
        z: spherePoint.z
    });
    
    // Clear any existing memo ID (for new memos)
    memoForm.dataset.memoId = '';
    
    // Clear the content
    document.getElementById('memoContent').value = '';
    
    // Reset save button to make sure it calls saveMemo
    resetSaveButton();
    
    // Show the form
    memoForm.style.display = 'block';
    
    // Focus on the text area
    document.getElementById('memoContent').focus();
}

// Reset save button to its original state for creating new memos
function resetSaveButton() {
    const saveButton = document.getElementById('saveMemoBtn');
    if (!saveButton) return;
    
    saveButton.innerText = 'Save';
    
    // Remove existing event listeners by replacing with a clone
    const newSaveButton = saveButton.cloneNode(true);
    saveButton.replaceWith(newSaveButton);
    
    // Add proper event listener for memo creation
    newSaveButton.addEventListener('click', saveMemo);
}

// Save a new memo
function saveMemo(e) {
    if (e) {
        e.stopPropagation();
    }
    
    console.log("saveMemo called");
    
    const content = document.getElementById('memoContent').value.trim();
    
    if (!content) {
        alert('Please enter memo content');
        return;
    }
    
    const memoForm = document.getElementById('memoForm');
    const vector3D = JSON.parse(memoForm.dataset.vector3D);
    const memoId = memoForm.dataset.memoId;
    
    console.log("Memo form data:", { 
        content, 
        vector3D, 
        memoId, 
        hasExistingMemo: memoId && currentMemos.some(m => m.id === memoId) 
    });
    
    // If memoId exists, we're updating an existing memo
    if (memoId && currentMemos.some(m => m.id === memoId)) {
        updateMemo(memoId);
        return;
    }
    
    // Get selected memo type
    const typeRadios = document.getElementsByName('memoType');
    let selectedType = 'other';
    
    for (const radio of typeRadios) {
        if (radio.checked) {
            selectedType = radio.value;
            break;
        }
    }
    
    // Create memo object
    const now = new Date();
    const newMemoId = `memo_${now.getTime()}_${memoCounter++}`;
    
    const memo = {
        id: newMemoId,
        content: content,
        type: selectedType,
        position: vector3D, // Store 3D coordinates instead of screen coordinates
        creator: currentUser,
        createdAt: now,
        updatedAt: now,
        replies: []
    };
    
    console.log("Creating new memo:", memo);
    
    // Add to current memos
    currentMemos.push(memo);
    
    // Save to storage
    saveMemosForCurrentView();
    
    // Create memo icon in the panorama
    createMemoIcon(memo);
    
    // Hide the form and exit memo mode
    memoForm.style.display = 'none';
    document.getElementById('memoContent').value = '';
    // Clear memo ID
    memoForm.dataset.memoId = '';
    
    // Reset save button text and functionality for next time
    resetSaveButton();
    
    exitMemoMode();
}

// Edit an existing memo
function editMemo(memo) {
    const memoForm = document.getElementById('memoForm');
    
    // Hide hover view if it exists
    const hoverViewId = `memoHoverView_${memo.id}`;
    const hoverView = document.getElementById(hoverViewId);
    if (hoverView) {
        // 애니메이션 효과로 부드럽게 숨김
        hoverView.style.opacity = '0';
        setTimeout(() => {
            hoverView.style.display = 'none';
        }, 200);
    }
    
    // Fill form with existing memo data
    document.getElementById('memoContent').value = memo.content;
    
    // Select the correct radio button
    const typeRadios = document.getElementsByName('memoType');
    for (const radio of typeRadios) {
        radio.checked = radio.value === memo.type;
    }
    
    // Calculate position for memo form
    const vector = new THREE.Vector3(
        memo.position.x,
        memo.position.y,
        memo.position.z
    );
    vector.project(window.camera);
    
    // Convert to screen coordinates
    const screenX = (vector.x + 1) / 2 * window.innerWidth;
    const screenY = (-vector.y + 1) / 2 * window.innerHeight;
    
    // Position the form
    memoForm.style.position = 'fixed';
    memoForm.style.left = screenX + 'px';
    memoForm.style.top = (screenY + 20) + 'px';
    
    // Store 3D coordinates and memo ID
    memoForm.dataset.vector3D = JSON.stringify({
        x: memo.position.x,
        y: memo.position.y,
        z: memo.position.z
    });
    memoForm.dataset.memoId = memo.id;
    
    // Change save button text
    const saveButton = document.getElementById('saveMemoBtn');
    saveButton.innerText = 'Update';
    
    // Remove existing click event listener and add new one for update
    const newSaveButton = saveButton.cloneNode(true);
    saveButton.replaceWith(newSaveButton);
    
    // Add new event listener to the cloned button
    newSaveButton.addEventListener('click', function(e) {
        e.stopPropagation();
        updateMemo(memo.id);
    });
    
    // Make sure the cancel button works properly
    const cancelButton = document.getElementById('cancelMemoBtn');
    const newCancelButton = cancelButton.cloneNode(true);
    cancelButton.replaceWith(newCancelButton);
    
    // Add a direct event listener to the cancel button to handle the edit cancellation
    newCancelButton.addEventListener('click', function(e) {
        e.stopPropagation();
        cancelMemoCreation();
    });
    
    // Hide the memo view
    const memoViewId = `memoView_${memo.id}`;
    const memoView = document.getElementById(memoViewId);
    if (memoView) {
        memoView.style.display = 'none';
    }
    
    // Prevent events from bubbling up from the memo form EXCEPT for button clicks
    ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'].forEach(eventType => {
        memoForm.addEventListener(eventType, (e) => {
            // Don't stop propagation if the click is on a button
            if (!e.target.matches('button')) {
                e.stopPropagation();
            }
        }, true);
    });
    
    // Special handling for textarea to ensure it gets focus
    const memoContent = document.getElementById('memoContent');
    memoContent.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        setTimeout(() => e.target.focus(), 10);
    });
    
    // Show the form
    memoForm.style.display = 'block';
    
    // Focus the textarea
    document.getElementById('memoContent').focus();
}

// Cancel memo creation
function cancelMemoCreation() {
    console.log("Cancel button clicked");
    const memoForm = document.getElementById('memoForm');
    
    // Check if we were editing an existing memo
    const memoId = memoForm.dataset.memoId;
    const editedMemo = memoId ? currentMemos.find(m => m.id === memoId) : null;
    
    // Hide the form
    memoForm.style.display = 'none';
    document.getElementById('memoContent').value = '';
    
    // Clear memo ID to ensure new memos can be created
    memoForm.dataset.memoId = '';
    
    // Reset save button
    resetSaveButton();
    
    // If we were editing a memo and it's currently being hovered, show the hover view again
    if (editedMemo && hoveredMemo && hoveredMemo.id === editedMemo.id) {
        const hoverViewId = `memoHoverView_${editedMemo.id}`;
        const hoverView = document.getElementById(hoverViewId);
        
        if (hoverView) {
            // Show with fade-in effect
            hoverView.style.display = 'block';
            setTimeout(() => {
                hoverView.style.opacity = '1';
            }, 10);
        } else {
            // If hover view doesn't exist, create it
            showHoverMemoView(editedMemo);
        }
    }
}

// Create memo icon in the panorama
function createMemoIcon(memo) {
    if (!window.scene) {
        console.warn("Scene not initialized yet");
        return;
    }
    
    // Create sprite for 3D positioning
    const texture = new THREE.CanvasTexture(createMemoIconCanvas(memo));
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        sizeAttenuation: true // Enable size attenuation based on distance
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(10, 10, 1); // Increased from 3 to 10
    sprite.position.set(memo.position.x, memo.position.y, memo.position.z);
    sprite.userData = { type: 'memo', id: memo.id };
    
    // Add to scene
    window.scene.add(sprite);
    
    // Store reference to sprite in memo object
    memo.sprite = sprite;
}

// Create canvas for memo icon
function createMemoIconCanvas(memo) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    
    const ctx = canvas.getContext('2d');
    
    // Draw circle background
    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, Math.PI * 2);
    ctx.fillStyle = MEMO_TYPES[memo.type].color;
    ctx.fill();
    
    // Set font with specific Unicode font families
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px "Segoe UI Symbol", "Arial Unicode MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw icon with slight y-offset for better vertical centering
    ctx.fillText(MEMO_TYPES[memo.type].icon, 16, 17);
    
    return canvas;
}

// Update positions of memo icons
function updateMemoIconPositions() {
    if (!window.camera) return;
    
    const memoForm = document.getElementById('memoForm');
    
    // 아무 메모가 없으면 처리할 필요 없음
    if (currentMemos.length === 0) return;
    
    currentMemos.forEach(memo => {
        if (memo.sprite) {
            // Convert 3D position to screen coordinates
            const vector = new THREE.Vector3(
                memo.position.x,
                memo.position.y,
                memo.position.z
            );
            
            vector.project(window.camera);
            
            // Check if the memo is in the camera view
            const isInView = vector.z <= 1 && 
                             vector.x >= -1.1 && vector.x <= 1.1 && 
                             vector.y >= -1.1 && vector.y <= 1.1;
            
            // Convert to screen coordinates
            const screenX = (vector.x + 1) / 2 * window.innerWidth;
            const screenY = (-vector.y + 1) / 2 * window.innerHeight;
            
            // Update sprite scale based on distance from camera
            const distance = window.camera.position.distanceTo(memo.sprite.position);
            const scale = Math.max(6, 15 - (distance / 50));
            memo.sprite.scale.set(scale, scale, 1);
            
            // If this memo's form is visible, update its position
            if (memoForm && memoForm.style && memoForm.style.display === 'block') {
                const formMemoId = memoForm.dataset.memoId;
                if (formMemoId === memo.id || (!formMemoId && memoForm.dataset.vector3D)) {
                    const formVector3D = JSON.parse(memoForm.dataset.vector3D);
                    if (formVector3D.x === memo.position.x && 
                        formVector3D.y === memo.position.y && 
                        formVector3D.z === memo.position.z) {
                        // Update form position
                        memoForm.style.left = screenX + 'px';
                        memoForm.style.top = (screenY + 20) + 'px';
                        
                        // Hide the form if memo is not in view
                        if (!isInView) {
                            memoForm.style.display = 'none';
                            document.getElementById('memoContent').value = '';
                            // Clear memo ID to ensure new memos can be created
                            memoForm.dataset.memoId = '';
                            // Reset save button
                            resetSaveButton();
                        }
                    }
                }
            }
            
            // Update position of hover view if it exists
            const hoverViewId = `memoHoverView_${memo.id}`;
            const hoverView = document.getElementById(hoverViewId);
            if (hoverView && hoverView.style) {
                if (isInView) {
                    // Memo is in view, update hover view position
                    if (hoverView.style.display === 'block') {
                        let left = screenX + 30;
                        if (left + 250 > window.innerWidth) {
                            left = screenX - 250 - 10;
                        }
                        
                        let top = screenY - 60;
                        if (top < 10) {
                            top = screenY + 30;
                        }
                        if (top + 150 > window.innerHeight) {
                            top = window.innerHeight - 160;
                        }
                        
                        hoverView.style.left = left + 'px';
                        hoverView.style.top = top + 'px';
                    }
                } else {
                    // Memo is not in view, hide the hover view
                    if (hoverView.style.display === 'block') {
                        hoverView.style.opacity = '0';
                        setTimeout(() => {
                            hoverView.style.display = 'none';
                        }, 200);
                        
                        // Reset hover state if needed
                        if (hoveredMemo && hoveredMemo.id === memo.id) {
                            hoveredMemo = null;
                        }
                    }
                }
            }
            
            // Update position of memo detail view if it exists and is visible
            const memoViewId = `memoView_${memo.id}`;
            const memoView = document.getElementById(memoViewId);
            if (memoView && memoView.style) {
                if (isInView) {
                    // Memo is in view, update position
                    if (memoView.style.display === 'block') {
                        let left = screenX + 40;
                        if (left + 350 > window.innerWidth) {
                            left = screenX - 350 - 10;
                        }
                        
                        let top = screenY - 200; // Position the view above the icon
                        if (top < 10) {
                            top = screenY + 40; // If too high, position below the icon
                        }
                        if (top + 400 > window.innerHeight) {
                            top = window.innerHeight - 410; // Ensure it stays within the viewport
                        }
                        
                        memoView.style.left = left + 'px';
                        memoView.style.top = top + 'px';
                    }
                } else {
                    // Memo is not in view, hide the detail view
                    if (memoView.style.display === 'block') {
                        memoView.style.display = 'none';
                        if (activeMemo && activeMemo.id === memo.id) {
                            activeMemo = null;
                        }
                    }
                }
            }
        }
    });
}

// Show memo details in a popup
function showMemoDetails(memo) {
    // Create a unique memo view for this memo
    const memoViewId = `memoView_${memo.id}`;
    let memoView = document.getElementById(memoViewId);
    
    if (!memoView) {
        memoView = document.createElement('div');
        memoView.id = memoViewId;
        memoView.className = 'memo-view';
        memoView.style.display = 'none';
        memoView.style.position = 'fixed';
        memoView.style.width = '350px';
        memoView.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        memoView.style.color = 'white';
        memoView.style.padding = '15px';
        memoView.style.borderRadius = '8px';
        memoView.style.zIndex = '1000';
        memoView.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        memoView.style.maxHeight = '400px';
        memoView.style.overflowY = 'auto';
        document.getElementById('panorama').appendChild(memoView);
    }
    
    // Format dates
    const createdDate = new Date(memo.createdAt).toLocaleString();
    const updatedDate = new Date(memo.updatedAt).toLocaleString();
    
    // Generate HTML for replies
    let repliesHtml = '';
    memo.replies.forEach((reply, index) => {
        repliesHtml += `
            <div style="border-top: 1px solid #555; padding-top: 10px; margin-top: 10px;">
                <div style="display: flex; justify-content: space-between;">
                    <strong>${reply.user}</strong>
                    <span style="font-size: 0.8em;">${new Date(reply.date).toLocaleString()}</span>
                </div>
                <p style="margin: 5px 0;">${reply.content}</p>
            </div>
        `;
    });
    
    // Fill the memo view
    memoView.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0; color: ${MEMO_TYPES[memo.type].color};">${MEMO_TYPES[memo.type].icon} ${capitalizeFirstLetter(memo.type)} Memo</h3>
            <div>
                <button id="editMemoBtn_${memo.id}" style="background: #2196f3; border: none; color: white; padding: 5px 8px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Edit</button>
                <button id="deleteMemoBtn_${memo.id}" style="background: #f44336; border: none; color: white; padding: 5px 8px; border-radius: 4px; cursor: pointer;">Delete</button>
            </div>
        </div>
        <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between;">
                <span><strong>Creator:</strong> ${memo.creator}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #aaa; margin-top: 5px;">
                <span>Created: ${createdDate}</span>
                <span>Updated: ${updatedDate}</span>
            </div>
        </div>
        <div style="background: rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 4px; margin-bottom: 15px;">
            <p style="margin: 0;">${memo.content}</p>
        </div>
        <div style="margin-top: 15px;">
            <h4 style="margin: 0 0 10px 0;">Replies</h4>
            <div id="memoReplies_${memo.id}">
                ${repliesHtml}
            </div>
            <div style="margin-top: 15px;">
                <textarea id="replyContent_${memo.id}" placeholder="Add a reply..." style="width: 100%; height: 60px; background: rgba(255, 255, 255, 0.9); border: none; padding: 8px; border-radius: 4px;"></textarea>
                <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                    <button id="submitReplyBtn_${memo.id}" style="background: #4caf50; border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Submit Reply</button>
                </div>
            </div>
        </div>
        <button id="closeMemoViewBtn_${memo.id}" style="position: absolute; top: 5px; right: 5px; background: none; border: none; color: #ccc; font-size: 20px; cursor: pointer; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s ease;">X</button>
    `;
    
    // Calculate position for memo view
    const vector = new THREE.Vector3(
        memo.position.x,
        memo.position.y,
        memo.position.z
    );
    vector.project(window.camera);
    
    // Convert to screen coordinates
    const x = (vector.x + 1) / 2 * window.innerWidth;
    const y = (-vector.y + 1) / 2 * window.innerHeight;
    
    // Position the view near the projected point
    let left = x + 40;
    if (left + 350 > window.innerWidth) {
        left = x - 350 - 10;
    }
    
    let top = y - 200; // Position the view above the icon
    if (top < 10) {
        top = y + 40; // If too high, position below the icon
    }
    if (top + 400 > window.innerHeight) {
        top = window.innerHeight - 410; // Ensure it stays within the viewport
    }
    
    // Use fixed positioning
    memoView.style.left = left + 'px';
    memoView.style.top = top + 'px';
    
    // Show the view
    memoView.style.display = 'block';
    
    // Store active memo
    activeMemo = memo;
    
    // Prevent events from bubbling up from the memo view
    // Must be added after setting innerHTML
    ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'].forEach(eventType => {
        memoView.addEventListener(eventType, (e) => {
            e.stopPropagation();
        });
    });
    
    // Add event listeners
    document.getElementById(`closeMemoViewBtn_${memo.id}`).addEventListener('click', (e) => {
        e.stopPropagation();
        memoView.style.display = 'none';
        if (activeMemo && activeMemo.id === memo.id) {
            activeMemo = null;
        }
    });
    
    document.getElementById(`editMemoBtn_${memo.id}`).addEventListener('click', (e) => {
        e.stopPropagation();
        editMemo(memo);
    });
    
    document.getElementById(`deleteMemoBtn_${memo.id}`).addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this memo?')) {
            // Remove sprite from scene
            if (memo.sprite) {
                window.scene.remove(memo.sprite);
                if (memo.sprite.material) {
                    memo.sprite.material.dispose();
                    if (memo.sprite.material.map) {
                        memo.sprite.material.map.dispose();
                    }
                }
            }
            
            // Remove memo view from DOM
            memoView.remove();
            
            // Remove from array
            currentMemos = currentMemos.filter(m => m.id !== memo.id);
            
            // Save updated list
            saveMemosForCurrentView();
            
            // Clear active memo if this was the active one
            if (activeMemo && activeMemo.id === memo.id) {
                activeMemo = null;
            }
            
            // Clear any memo ID in the form to ensure new memos can be created
            const memoForm = document.getElementById('memoForm');
            if (memoForm && memoForm.dataset.memoId === memo.id) {
                memoForm.dataset.memoId = '';
            }
        }
    });
    
    // Fix for reply textarea and button event handling
    const replyContent = document.getElementById(`replyContent_${memo.id}`);
    const submitReplyBtn = document.getElementById(`submitReplyBtn_${memo.id}`);
    
    // Prevent event propagation for the textarea with multiple event types
    ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'focus'].forEach(eventType => {
        replyContent.addEventListener(eventType, (e) => {
            e.stopPropagation();
        });
    });
    
    // Make sure focus doesn't trigger closing by explicitly grabbing focus
    replyContent.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        // Use timeout to ensure focus happens after all other events
        setTimeout(() => replyContent.focus(), 10);
    });
    
    // Prevent event propagation for the submit button
    ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'].forEach(eventType => {
        submitReplyBtn.addEventListener(eventType, (e) => {
            e.stopPropagation();
        });
    });
    
    // Set up submission event
    submitReplyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addReply(memo);
    });
    
    // Additional handling for all elements inside the memo view
    // This ensures no clicks inside the view will close it
    memoView.querySelectorAll('*').forEach(element => {
        ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'].forEach(eventType => {
            element.addEventListener(eventType, (e) => {
                e.stopPropagation();
            });
        });
    });
}

// Update an existing memo
function updateMemo(memoId) {
    const content = document.getElementById('memoContent').value.trim();
    
    if (!content) {
        alert('Please enter memo content');
        return;
    }
    
    // Find the memo
    const memoIndex = currentMemos.findIndex(m => m.id === memoId);
    if (memoIndex === -1) return;
    
    const memo = currentMemos[memoIndex];
    
    // Get selected memo type
    const typeRadios = document.getElementsByName('memoType');
    let selectedType = memo.type;
    
    for (const radio of typeRadios) {
        if (radio.checked) {
            selectedType = radio.value;
            break;
        }
    }
    
    // Update memo
    memo.content = content;
    memo.type = selectedType;
    memo.updatedAt = new Date();
    
    // Update the memo in the array
    currentMemos[memoIndex] = memo;
    
    // Save to storage
    saveMemosForCurrentView();
    
    // Update the sprite texture
    if (memo.sprite) {
        const newTexture = new THREE.CanvasTexture(createMemoIconCanvas(memo));
        memo.sprite.material.map = newTexture;
        memo.sprite.material.needsUpdate = true;
    }
    
    // Hide the form
    const memoForm = document.getElementById('memoForm');
    memoForm.style.display = 'none';
    document.getElementById('memoContent').value = '';
    
    // Reset save button text
    document.getElementById('saveMemoBtn').innerText = 'Save';
    
    // Update hover view if this memo is currently being hovered
    if (hoveredMemo && hoveredMemo.id === memo.id) {
        // 호버 뷰 내용만 업데이트
        showHoverMemoView(memo);
    }
    
    // Show updated memo details
    showMemoDetails(memo);
}

// Add a reply to a memo
function addReply(memo) {
    if (!memo) return;
    
    const replyContent = document.getElementById(`replyContent_${memo.id}`).value.trim();
    
    if (!replyContent) {
        alert('Please enter a reply');
        return;
    }
    
    // Create reply object
    const reply = {
        user: currentUser,
        date: new Date(),
        content: replyContent
    };
    
    // Find the memo
    const memoIndex = currentMemos.findIndex(m => m.id === memo.id);
    if (memoIndex === -1) return;
    
    // Add reply
    currentMemos[memoIndex].replies.push(reply);
    
    // Save to storage
    saveMemosForCurrentView();
    
    // Update the view
    showMemoDetails(memo);
    
    // Clear the reply input
    document.getElementById(`replyContent_${memo.id}`).value = '';
}

// Save memos for the current view (location and date)
function saveMemosForCurrentView() {
    // Get current location ID (use lastPanoramaUID) and date from panorama.js
    const locationId = window.lastPanoramaUID || 'default';
    const dateStr = window.selectedDateStr || window.currentDateStr || 'default';
    
    // Save only by location and date combination
    saveMemosForDate(locationId, dateStr);
    
    console.log(`Saved ${currentMemos.length} memos for location ${locationId} on date ${dateStr}`);
}

// Save memos for specific date
function saveMemosForDate(locationId, dateStr) {
    // Create a key for storage by date
    const storageKey = `memos_${locationId}_${dateStr}`;
    
    // Save to localStorage (for demo purposes)
    localStorage.setItem(storageKey, JSON.stringify(currentMemos));
}

// Load memos for the current view (location and date)
function loadMemosForCurrentView() {
    console.log("Loading memos for current view...");
    
    // First clear existing memos
    clearMemoIcons();
    currentMemos = [];
    
    // Get current location ID and date from panorama.js
    let locationId = window.lastPanoramaUID || 'default';
    
    // If lastPanoramaUID is not available, try to get it from currentLocation
    if (locationId === 'default' && window.currentLocation && window.currentLocation.uid) {
        locationId = window.currentLocation.uid;
        console.log("Using currentLocation.uid instead:", locationId);
    }
    
    const dateStr = window.selectedDateStr || window.currentDateStr || 'default';
    
    console.log("Loading memos with locationId:", locationId, "dateStr:", dateStr);
    
    // Only load memos for the specific date and location
    const memos = loadMemosForDate(locationId, dateStr);
    
    if (memos && memos.length > 0) {
        // Use the memos
        currentMemos = memos;
        
        // Create icons for all memos
        currentMemos.forEach(memo => {
            createMemoIcon(memo);
        });
        
        console.log(`Loaded ${currentMemos.length} memos for location ${locationId} on date ${dateStr}`);
    } else {
        console.log("No memos found for current view");
    }
}

// Load memos for specific date
function loadMemosForDate(locationId, dateStr) {
    // Create a key for storage by date
    const storageKey = `memos_${locationId}_${dateStr}`;
    
    // Load from localStorage (for demo purposes)
    const savedMemos = localStorage.getItem(storageKey);
    
    if (savedMemos) {
        // Parse the JSON data
        return JSON.parse(savedMemos);
    }
    
    return null;
}

// Function to save memos when changing date
function saveMemosForCurrentDate() {
    if (currentMemos.length > 0) {
        const locationId = window.lastPanoramaUID || 'default';
        const dateStr = window.selectedDateStr || window.currentDateStr || 'default';
        saveMemosForDate(locationId, dateStr);
    }
}

// Function for location change - empty implementation to maintain compatibility
function saveMemosForCurrentLocation() {
    // This function intentionally left empty
    // We no longer save memos by location only
    console.log("saveMemosForCurrentLocation called but ignored - memos now save by date and location only");
}

// Clear all memo icons from the panorama
function clearMemoIcons() {
    currentMemos.forEach(memo => {
        if (memo.sprite) {
            window.scene.remove(memo.sprite);
            if (memo.sprite.material) {
                memo.sprite.material.dispose();
                if (memo.sprite.material.map) {
                    memo.sprite.material.map.dispose();
                }
            }
        }
    });
    
    // Clear the array
    currentMemos = [];
    
    // Also close any open memo views or forms
    const memoForm = document.getElementById('memoForm');
    if (memoForm) {
        memoForm.style.display = 'none';
        memoForm.dataset.memoId = ''; // 메모 ID도 초기화
        document.getElementById('memoContent').value = ''; // 내용도 초기화
    }
    
    // Reset hover state and remove hover views
    hoveredMemo = null;
    
    // Find and remove all memo views (both regular and hover views)
    document.querySelectorAll('.memo-view, .memo-hover-view').forEach(view => {
        view.remove();
    });
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Handle mouse move events for hover detection
function handleMouseMove(event) {
    // Update last mouse position
    lastMousePosition.x = event.clientX;
    lastMousePosition.y = event.clientY;
    
    // If we're not in memo mode, check for hover
    if (!isMemoMode) {
        // If we already have a timeout for hover detection, clear it
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }
        
        // Set a small timeout to reduce excessive calculations
        hoverTimeout = setTimeout(() => {
            checkForMemoHover(event);
        }, 50);
    }
}

// Check if mouse is hovering over a memo sprite
function checkForMemoHover(event) {
    // Don't do hover detection if we're dragging or in memo mode
    if (isMouseDown || isMemoMode) return;
    
    const panorama = document.getElementById('panorama');
    const rect = panorama.getBoundingClientRect();
    
    // Convert mouse coordinates to normalized device coordinates (-1 to +1)
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Create raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), window.camera);
    
    // Get all memo sprites
    const sprites = currentMemos.map(memo => memo.sprite).filter(sprite => sprite);
    
    // Check for intersections
    const intersects = raycaster.intersectObjects(sprites, true);
    
    if (intersects.length > 0) {
        // Find the corresponding memo
        const hoverSprite = intersects[0].object;
        const newHoveredMemo = currentMemos.find(memo => memo.sprite === hoverSprite);
        
        if (newHoveredMemo) {
            // 이전과 다른 메모를 호버하는 경우에만 처리
            if (hoveredMemo !== newHoveredMemo) {
                // 이전에 호버한 메모가 있고 활성화된 메모가 아니라면 닫기
                if (hoveredMemo && !isActiveMemo(hoveredMemo)) {
                    hideHoverMemoView(hoveredMemo);
                }
                
                // 새로 호버한 메모가 이미 활성화된 메모가 아닐 때만 표시
                if (!isActiveMemo(newHoveredMemo)) {
                    showHoverMemoView(newHoveredMemo);
                }
                
                // 현재 호버 중인 메모 업데이트
                hoveredMemo = newHoveredMemo;
            }
        }
    } else {
        // 마우스가 어떤 메모 위에도 없을 때
        if (hoveredMemo && !isActiveMemo(hoveredMemo)) {
            hideHoverMemoView(hoveredMemo);
        }
        hoveredMemo = null;
    }
}

// Check if a memo is currently active (showing details from click)
function isActiveMemo(memo) {
    return activeMemo && activeMemo.id === memo.id;
}

// Show memo detail view when hovering
function showHoverMemoView(memo) {
    console.log("Showing hover view for memo:", memo.id); // 디버깅용
    
    const hoverViewId = `memoHoverView_${memo.id}`;
    
    // Check if the hover view already exists
    let hoverView = document.getElementById(hoverViewId);
    
    // Format dates
    const createdDate = new Date(memo.createdAt).toLocaleString();
    
    // HTML 내용 준비
    const hoverContent = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <h4 style="margin: 0; color: ${MEMO_TYPES[memo.type].color};">${MEMO_TYPES[memo.type].icon} ${capitalizeFirstLetter(memo.type)}</h4>
            <small style="color: #aaa;">${memo.creator}</small>
        </div>
        <p style="margin: 5px 0; max-height: 80px; overflow: hidden; text-overflow: ellipsis;">${memo.content}</p>
        <div style="font-size: 0.8em; color: #aaa; text-align: right;">
            ${createdDate}
        </div>
    `;
    
    if (!hoverView) {
        // 호버 뷰가 없으면 새로 생성
        hoverView = document.createElement('div');
        hoverView.id = hoverViewId;
        hoverView.className = 'memo-hover-view';
        hoverView.style.display = 'none';
        hoverView.style.position = 'fixed';
        hoverView.style.width = '250px';
        hoverView.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        hoverView.style.color = 'white';
        hoverView.style.padding = '10px';
        hoverView.style.borderRadius = '6px';
        hoverView.style.zIndex = '900'; // 활성 메모 뷰보다 낮은 z-index
        hoverView.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.4)';
        hoverView.style.transition = 'opacity 0.2s ease-in-out';
        hoverView.style.opacity = '0';
        document.getElementById('panorama').appendChild(hoverView);
    }
    
    // 호버 뷰 내용 업데이트 (새로 생성하든 기존 것이든)
    hoverView.innerHTML = hoverContent;
    
    // Calculate position for hover view
    updateHoverViewPosition(memo);
    
    // Show with fade-in effect
    hoverView.style.display = 'block';
    setTimeout(() => {
        hoverView.style.opacity = '1';
    }, 10);
}

// Hide hover view for a memo
function hideHoverMemoView(memo) {
    const hoverViewId = `memoHoverView_${memo.id}`;
    const hoverView = document.getElementById(hoverViewId);
    
    if (hoverView) {
        // Add fade-out effect
        hoverView.style.opacity = '0';
        
        // Remove after animation completes
        setTimeout(() => {
            hoverView.style.display = 'none';
        }, 200);
    }
}

// Update position of hover view based on memo position
function updateHoverViewPosition(memo) {
    const hoverViewId = `memoHoverView_${memo.id}`;
    const hoverView = document.getElementById(hoverViewId);
    
    if (!hoverView) return;
    
    // Calculate position for memo hover view
    const vector = new THREE.Vector3(
        memo.position.x,
        memo.position.y,
        memo.position.z
    );
    vector.project(window.camera);
    
    // Convert to screen coordinates
    const x = (vector.x + 1) / 2 * window.innerWidth;
    const y = (-vector.y + 1) / 2 * window.innerHeight;
    
    // Position the view near the projected point - slightly to the right
    let left = x + 30;
    if (left + 250 > window.innerWidth) {
        left = x - 250 - 10;
    }
    
    let top = y - 60; // Position the view above the icon
    if (top < 10) {
        top = y + 30; // If too high, position below the icon
    }
    if (top + 150 > window.innerHeight) {
        top = window.innerHeight - 160; // Ensure it stays within the viewport
    }
    
    // Use fixed positioning
    hoverView.style.left = left + 'px';
    hoverView.style.top = top + 'px';
}

// Export functions for use in panorama.js
window.initMemoSystem = initMemoSystem;
window.updateMemoIconPositions = updateMemoIconPositions;
window.clearMemoIcons = clearMemoIcons;
window.loadMemosForCurrentView = loadMemosForCurrentView;
window.saveMemosForCurrentDate = saveMemosForCurrentDate;
window.saveMemosForCurrentLocation = saveMemosForCurrentLocation; 