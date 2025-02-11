document.addEventListener("DOMContentLoaded", function () {
    const virtualTourButton = document.getElementById("virtual-tour-button");
    const virtualTourContainer = document.getElementById("virtual-tour-container");
    const panoramaListContainer = document.getElementById("panorama-list");

    virtualTourButton.addEventListener("click", function () {
        const projectId = this.dataset.projectId; 

    });

    function loadPanorama(imageUrl) {
        const viewer = document.getElementById("panorama-viewer");
        viewer.style.backgroundImage = 'url(${imageUrl})';
        viewer.style.display = "block";
    }
});