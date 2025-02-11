// 로컬 스토리지에서 프로젝트 정보를 가져와서 화면에 표시
window.addEventListener('load', function() {
    const projects = JSON.parse(localStorage.getItem('projects')) || [];
    const projectCardsContainer = document.querySelector('.project-grid');

    projects.forEach((project, index) => {
        const projectCard = document.createElement('div');
        projectCard.classList.add('project-card');

        // 프로젝트 카드 내용 추가
        projectCard.innerHTML = `
            <img src="${project.image || 'default-image.jpg'}" alt="프로젝트 이미지" class="project-image">
            <h4>${project.name}</h4>
            <p>${project.period}</p>
            <p>공정률: 80%</p>
            <div class="project-stats">
                <span class="new-alert">NEW 10건</span>
                <span class="issue-alert">⚠️ 2건</span>
                <span class="question-alert">❓ 1건</span>
            </div>
            <button class="delete-btn" data-index="${index}">삭제</button>
        `;

        projectCardsContainer.appendChild(projectCard);
    });

    // 삭제 버튼 클릭 이벤트 등록
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const projectIndex = parseInt(this.getAttribute('data-index'));
            deleteProject(projectIndex);
        });
    });
});

// 프로젝트 삭제 함수
function deleteProject(index) {
    let projects = JSON.parse(localStorage.getItem('projects')) || [];
    projects.splice(index, 1);  // 해당 인덱스의 프로젝트 제거
    localStorage.setItem('projects', JSON.stringify(projects));  // 로컬 스토리지 갱신

    // 페이지를 새로고침하여 업데이트
    window.location.reload();
}
