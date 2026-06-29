const socket = new WebSocket(`ws://${window.location.hostname}:3000`);

const params = new URLSearchParams(window.location.search);
const docId = params.get("id");

const historyList = document.getElementById("history-list");

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
        alert("Version restored!");
        location.reload();
    }
};

function renderVersions(versions){
    historyList.innerHTML = "";

    if(!versions.length){
        historyList.innerHTML = "<h2>Belum ada version</h2>";
        return;
    }

    versions.forEach((version,index)=>{
        const div = document.createElement("div");
        div.className = "version-card";

        div.innerHTML = `
            <h3>Version ${versions.length-index}</h3>
            <div class="version-time">${version.created_at}</div>
            <div class="version-content">${escapeHtml(version.content)}</div>
            <button class="restore-btn" onclick="restoreVersion(${version.id})">
                Restore
            </button>
        `;

        historyList.appendChild(div);
    });
}

function restoreVersion(versionId){
    socket.send(JSON.stringify({
        type:"rollback",
        versionId: versionId
    }));
}

function escapeHtml(text){
    const div = document.createElement("div");
    div.innerText = text;
    return div.innerHTML;
}