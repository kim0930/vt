document.addEventListener("DOMContentLoaded", function () {
    const virtualTourButton = document.getElementById("virtual-tour-button");
    const virtualTourContainer = document.getElementById("virtual-tour-container");
    const panoramaListContainer = document.getElementById("panorama-list");

    virtualTourButton.addEventListener("click", function () {
        const projectId = this.dataset.projectId; // 프로젝트 ID 가져오기
        fetch('/virtual_tour/panoramas/${projectId}/')
            .then(response => response.json())
            .then(data => {
                panoramaListContainer.innerHTML = "";
                data.forEach(panorama => {
                    const panoramaItem = document.createElement("div");
                    panoramaItem.classList.add("panorama-item");
                    panoramaItem.innerHTML = `
                        <img src="${panorama.image}" alt="${panorama.name}" class="panorama-thumbnail" />
                        <p>${panorama.name}</p>
                    `;
                    panoramaItem.addEventListener("click", function () {
                        loadPanorama(panorama.image);
                    });
                    panoramaListContainer.appendChild(panoramaItem);
                });

                virtualTourContainer.style.display = "block"; // 가상 투어 화면 표시
            })
            .catch(error => console.error("Error fetching panoramas:", error));
    });

    function loadPanorama(imageUrl) {
        const viewer = document.getElementById("panorama-viewer");
        viewer.style.backgroundImage = 'url(${imageUrl})';
        viewer.style.display = "block";
    }
});