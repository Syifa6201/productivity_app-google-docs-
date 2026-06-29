const socket = new WebSocket(`ws://${window.location.hostname}:3000`);

const params = new URLSearchParams(window.location.search);
const docId = params.get("id");

socket.onopen = () => {
    socket.send(JSON.stringify({
        type: "get_versions",
        id: docId
    }));
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if(data.type === "versions"){
        renderVersions(data.versions);
    }

    if(data.type === "rollback_success"){
        alert("Version restored");
        location.reload();
    }
};

function renderVersions(versions){
    const container = document.getElementById("history-list");
    container.innerHTML = "";

    if(versions.length === 0){
        container.innerHTML = "<h3>Belum ada version</h3>";
        return;
    }

    versions.forEach(v => {
        container.innerHTML += `
            <div class="version-card">
                <p><b>User:</b> ${v.username || "Unknown"}</p>
                <p><b>Waktu:</b> ${v.created_at}</p>

                <div class="version-content">
                    ${v.content}
                </div>

                <button class="restore-btn"
                    onclick="restoreVersion(${v.id})">
                    Restore
                </button>
            </div>
        `;
    });
}

function restoreVersion(versionId){
    socket.send(JSON.stringify({
        type:"rollback",
        versionId
    }));
}