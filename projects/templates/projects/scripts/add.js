function saveProject(event) {
    event.preventDefault();

    // 여러 개 선택된 세부 공사구분 가져오기
    const subcategorySelect = document.getElementById('project-subcategory');
    const selectedSubcategories = Array.from(subcategorySelect.selectedOptions).map(option => option.value);

    // 대표 이미지 가져오기
    const imageInput = document.getElementById('project-image');
    let projectImage = '';

    if (imageInput.files.length > 0) {
        const file = imageInput.files[0];
        const reader = new FileReader();

        // 파일 읽기 완료 시 실행되는 이벤트 핸들러
        reader.onload = function(e) {
            projectImage = e.target.result;

            // 프로젝트 데이터 저장
            saveProjectData(projectImage, selectedSubcategories);
        };

        reader.readAsDataURL(file);  // 이미지 파일을 Base64로 변환하여 읽음
    } else {
        // 이미지가 없을 경우 기본 데이터로 저장
        saveProjectData('', selectedSubcategories);
    }
}

function saveProjectData(projectImage, selectedSubcategories) {
    // 입력된 프로젝트 정보 가져오기
    const projectData = {
        name: document.getElementById('project-name').value,
        period: document.getElementById('project-period').value,
        category: document.getElementById('project-category').value,
        subcategory: selectedSubcategories,
        email: document.getElementById('project-email').value,
        contact: document.getElementById('project-contact').value,
        image: projectImage
    };

    // 로컬 스토리지에 저장
    const projects = JSON.parse(localStorage.getItem('projects')) || [];
    projects.push(projectData);
    localStorage.setItem('projects', JSON.stringify(projects));

    // 메인 페이지로 이동
    window.location.href = 'project_list_min.html';
}

document.getElementById('project-form').addEventListener('submit', saveProject);


        // 날짜 선택기 관련 변수
let selectingStartDate = true;  // 현재 시작일을 선택 중인지 여부
let startDate = '';  // 시작일 저장
let endDate = '';    // 종료일 저장

const projectPeriodInput = document.getElementById('project-period');
const datePickerModal = document.getElementById('date-picker-modal');
const datePickerTitle = document.getElementById('date-picker-title');
const yearSelect = document.getElementById('year-select');
const monthSelect = document.getElementById('month-select');
const daySelect = document.getElementById('day-select');

// 공사기간 입력 필드를 클릭하면 모달 열기
projectPeriodInput.addEventListener('click', openDatePicker);

function openDatePicker() {
    selectingStartDate = true;  // 시작일 선택 모드로 설정
    datePickerTitle.textContent = '시작일 선택';
    datePickerModal.classList.add('show');
    populateYearSelect();
    populateMonthSelect();
}

// 년도 선택 항목 채우기
function populateYearSelect() {
    yearSelect.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year <= currentYear + 10; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '년';
        yearSelect.appendChild(option);
    }
}

// 월 선택 항목 채우기
function populateMonthSelect() {
    monthSelect.innerHTML = '';
    for (let month = 1; month <= 12; month++) {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month + '월';
        monthSelect.appendChild(option);
    }
    populateDaySelect();  // 월 선택 후 날짜 채우기
}

// 일 선택 항목 채우기
function populateDaySelect() {
    daySelect.innerHTML = '';
    const selectedYear = parseInt(yearSelect.value);
    const selectedMonth = parseInt(monthSelect.value);
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const option = document.createElement('option');
        option.value = day;
        option.textContent = day + '일';
        daySelect.appendChild(option);
    }
}

// 월 변경 시 일 선택 항목 갱신
monthSelect.addEventListener('change', populateDaySelect);

// 확인 버튼 클릭 시 선택한 날짜 처리
document.getElementById('confirm-date-btn').addEventListener('click', function() {
    const selectedDate = `${yearSelect.value}-${monthSelect.value.padStart(2, '0')}-${daySelect.value.padStart(2, '0')}`;

    if (selectingStartDate) {
        startDate = selectedDate;
        selectingStartDate = false;
        datePickerTitle.textContent = '종료일 선택';
        populateYearSelect();
        populateMonthSelect();
    } else {
        endDate = selectedDate;
        projectPeriodInput.value = `${startDate} ~ ${endDate}`;
        closeDatePicker();
    }
});

// 취소 버튼 클릭 시 모달 닫기
document.getElementById('cancel-date-btn').addEventListener('click', closeDatePicker);

function closeDatePicker() {
    datePickerModal.classList.remove('show');
    selectingStartDate = true;  // 다음번 열 때 시작일부터 선택하도록 초기화
}

// 공사구분과 세부 공사구분 매핑 데이터
const subcategoriesByCategory = {
    '건축공사': ['주거용 건축물', '사무실용 건축물', '상업용 건축물', '공업용 건축물', '병원', '학교', '기타'],
    '토목공사': ['도로공사', '교량공사', '터널공사', '배수공사'],
    '플랜트공사': ['전력설비', '조명설비', '배선공사', '소방설비'],
    '조경공사': ['전력설비', '조명설비', '배선공사', '소방설비']
};

const categorySelect = document.getElementById('project-category');
const subcategorySelect = document.getElementById('project-subcategory');

// 공사구분 변경 시 세부 공사구분 동적 추가
categorySelect.addEventListener('change', function() {
    const selectedCategory = categorySelect.value;

    // 기존 옵션 제거
    subcategorySelect.innerHTML = '';

    // 선택한 공사구분에 따른 세부 공사구분 추가
    if (subcategoriesByCategory[selectedCategory]) {
        subcategoriesByCategory[selectedCategory].forEach(subcategory => {
            const option = document.createElement('option');
            option.value = subcategory;
            option.textContent = subcategory;
            subcategorySelect.appendChild(option);
        });
    }
});
