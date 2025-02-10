document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("sidebar");
    const mainContent = document.querySelector("main"); // 🔹 메인 콘텐츠 선택
    const toggleButton = document.getElementById("toggleSidebar");

    toggleButton.addEventListener("click", function () {
        sidebar.classList.toggle("minimized"); // 🔹 최소화 상태 변경
        mainContent.classList.toggle("expanded"); // 🔹 메인 콘텐츠 확장
    });
});
