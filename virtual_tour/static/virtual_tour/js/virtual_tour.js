document.addEventListener("DOMContentLoaded", function () {
    const virtualTourButton = document.getElementById("virtual-tour-button");
    const virtualTourContainer = document.getElementById("virtual-tour-container");
    const panoramaListContainer = document.getElementById("panorama-list");

    virtualTourButton.addEventListener("click", function () {
        const projectId = this.dataset.projectId; 
        fetch("first-folder-image")
            .then(response => response.json())
            .then(data => {
                console.log(data)
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

                virtualTourContainer.style.display = "block"; 
            })
            .catch(error => console.error("Error fetching panoramas:", error));
    });

    function loadPanorama(imageUrl) {
        const viewer = document.getElementById("panorama-viewer");
        viewer.style.backgroundImage = 'url(${imageUrl})';
        viewer.style.display = "block";
    }
});

// document.addEventListener("DOMContentLoaded", function() {
//     fetch("{% url 'virtual_tour:first-folder-images' project.id %}")
//     .then(response => response.json())
//     .then(data => {
//         console.log(data["folder_name"])
//         console.log(data.folder_name)

//         data.forEach(panorama => {

//             const panoramaItem = document.createElement("div");
//         });

//     })
//     .catch(error => console.error("Error fetching panoramas:", error));

// });