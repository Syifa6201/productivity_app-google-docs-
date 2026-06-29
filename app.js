let username = "";
const socket = new WebSocket(`ws://${window.location.hostname}:3000`);

let currentDocId = 1;
let notifCount = 0;
let selectedRenameId = null;
let selectedDeleteId = null;

const editor = document.getElementById("editor");
const chatBox = document.getElementById("chat-box");
const usersBox = document.getElementById("users-box");
const typingIndicator = document.getElementById("typing-indicator");
const avatar = document.getElementById("avatar");
const fileList = document.getElementById("file-list");
const docTitle = document.getElementById("doc-title");

avatar.innerText = username.charAt(0).toUpperCase();

socket.onopen = () => {
    console.log("WS CONNECTED");
};

socket.onerror = (e) => {
    console.log("WS ERROR", e);
};

socket.onclose = () => {
    console.log("WS CLOSED");
};

editor.addEventListener("input", () => {
    document.getElementById("save-status").innerText = "Saving...";

    socket.send(JSON.stringify({
        type: "typing",
        username
    }));

    socket.send(JSON.stringify({
        type: "edit",
        id: currentDocId,
        content: editor.innerHTML,
        username: username
    }));

    setTimeout(() => {
        document.getElementById("save-status").innerText = "Saved";
        addNotification("Document saved");
    }, 500);
});

editor.addEventListener("keyup", () => {
    socket.send(JSON.stringify({
        type: "cursor",
        username,
        position: editor.innerText.length
    }));
});

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "documents") {
        renderDocuments(data.documents);
    }

    if (data.type === "login_result") {
        if (data.success) {
            username = data.username;

            document.getElementById("login-modal").style.display = "none";

            if (username) {
                avatar.innerText = username.charAt(0).toUpperCase();
            }

            socket.send(JSON.stringify({
                type: "join",
                username
            }));

            socket.send(JSON.stringify({
                type: "get_documents"
            }));
        } else {
            alert("Login gagal");
        }
    }

    if (data.type === "register_result") {
        if (data.success) {
            alert("Register berhasil");
            backToLogin();
        } else {
            alert("Username sudah ada");
        }
    }

    if (data.type === "document") {
        currentDocId = data.id || currentDocId;
        editor.innerHTML = data.content || "";
        docTitle.value = data.title || "Untitled Document";
    }

    if(data.type==="comment"){
        document.getElementById("comment-box").innerHTML += `
            <div class="comment-item">
                <b>${data.username}</b><br>
                ${data.comment}
            </div>
        `;
    }

    if (data.type === "chat") {
        chatBox.innerHTML += `
            <div class="chat-bubble">
                <b>${data.username}</b><br>
                ${data.message}
            </div>
        `;
        chatBox.scrollTop = chatBox.scrollHeight;
        addNotification(`${data.username} sent a message`);
    }

    if (data.type === "users") {
        usersBox.innerHTML = "";

        data.users.forEach(user => {
            let name = user.username || user;
            let status = user.status || "online";

            let dot = "🟢";
            if (status === "idle") dot = "🟡";
            if (status === "offline") dot = "🔴";

            usersBox.innerHTML += `
                <p>${dot} ${name}</p>
            `;
        });
    }

    if (data.type === "typing") {
        if (data.username !== username) {
            typingIndicator.innerText = `${data.username} is typing...`;

            setTimeout(() => {
                typingIndicator.innerText = "";
            }, 1000);
        }
    }

    if (data.type === "notification") {
        addNotification(data.message);
    }

    if (data.type === "cursor") {
        if (data.username !== username) {
            typingIndicator.innerText =
                `${data.username} editing at position ${data.position}`;
        }
    }

    if (data.type === "profile") {
        document.getElementById("profile-username").value =
            data.profile.username || "";

        document.getElementById("profile-fullname").value =
            data.profile.fullname || "";

        document.getElementById("profile-bio").value =
            data.profile.bio || "";

        document.getElementById("profile-modal").style.display = "flex";
    }

    if(data.type==="versions"){
        let text = "Version History:\n\n";

        data.versions.forEach(v=>{
            text += `Version ${v.id} - ${v.created_at}\n`;
        });

        alert(text);
    }
};

function renderDocuments(documents) {
    fileList.innerHTML = "";

    documents.forEach(doc => {
        fileList.innerHTML += `
        <div class="file-item" onclick="openDocument(${doc.id}, '${doc.title.replace(/'/g, "\\'")}')">
            <span>📄 ${doc.title}</span>

            <div style="margin-top:8px;">
                <button onclick="event.stopPropagation(); renameDocument(${doc.id})">✏</button>
                <button onclick="event.stopPropagation(); deleteDocument(${doc.id})">🗑</button>
            </div>
        </div>
        `;
    });
}

function login() {
    const user = document.getElementById("login-username").value;
    const pass = document.getElementById("login-password").value;

    socket.send(JSON.stringify({
        type: "login",
        username: user,
        password: pass
    }));
}

function register() {
    const user = document.getElementById("register-username").value;
    const pass = document.getElementById("register-password").value;

    console.log("Tombol register diklik");

    if (socket.readyState !== WebSocket.OPEN) {
        alert("WebSocket belum connect ke server");
        console.log("Socket state:", socket.readyState);
        return;
    }

    socket.send(JSON.stringify({
        type: "register",
        username: user,
        password: pass
    }));
}

function showRegister(){
    document.getElementById("login-modal").style.display = "none";
    document.getElementById("register-modal").style.display = "flex";
}

function backToLogin(){
    document.getElementById("register-modal").style.display = "none";
    document.getElementById("login-modal").style.display = "flex";
}

function createNewDoc(){
    document.getElementById("newdoc-modal").style.display = "flex";
}

function closeNewDocModal(){
    document.getElementById("newdoc-modal").style.display = "none";
}

function saveNewDoc(){
    const title = document.getElementById("newdoc-input").value.trim();

    if(title === ""){
        alert("Nama dokumen tidak boleh kosong");
        return;
    }

    if(socket.readyState !== WebSocket.OPEN){
        alert("Server belum connect");
        return;
    }

    socket.send(JSON.stringify({
        type: "new_document",
        title: title
    }));

    document.getElementById("newdoc-input").value = "";
    closeNewDocModal();
}

function openDocument(id, title) {
    currentDocId = id;

    document.getElementById("doc-title").value = title;

    socket.send(JSON.stringify({
        type: "open_document",
        id
    }));
}

function sendChat() {
    const input = document.getElementById("chat-input");

    if (input.value.trim() === "") return;

    socket.send(JSON.stringify({
        type: "chat",
        username,
        message: input.value
    }));

    input.value = "";
}

function formatDoc(command) {
    document.execCommand(command, false, null);

    socket.send(JSON.stringify({
        type: "edit",
        id: currentDocId,
        content: editor.innerHTML
    }));
}

function shareDocument() {
    const link = `http://${window.location.hostname}/realtime_app`;

    document.getElementById("share-link").value = link;
    document.getElementById("share-modal").style.display = "flex";
}

function addNotification(message) {
    notifCount++;
    document.getElementById("notif-count").innerText = notifCount;

    const now = new Date();
    const time =
        now.getHours().toString().padStart(2,"0") + ":" +
        now.getMinutes().toString().padStart(2,"0");

    const list = document.getElementById("notification-list");

    list.innerHTML =
    `
    <div class="notif-item">
        <small>${time}</small><br>
        ${message}
    </div>
    ` + list.innerHTML;
}

function toggleNotificationPanel() {
    document.getElementById("notification-panel")
        .classList.toggle("show");
}

function showProfile() {
    socket.send(JSON.stringify({
        type: "get_profile",
        username
    }));
}

function renameDocument(id){
    selectedRenameId = id;
    document.getElementById("rename-modal").style.display = "flex";
}

function closeRenameModal(){
    document.getElementById("rename-modal").style.display = "none";
}

function saveRename(){
    const newTitle = document.getElementById("rename-input").value;

    if(!newTitle) return;

    socket.send(JSON.stringify({
        type:"rename_document",
        id:selectedRenameId,
        title:newTitle
    }));

    closeRenameModal();
}

function deleteDocument(id){
    selectedDeleteId = id;
    document.getElementById("delete-modal").style.display = "flex";
}

function closeDeleteModal(){
    document.getElementById("delete-modal").style.display = "none";
}

function confirmDelete(){
    socket.send(JSON.stringify({
        type:"delete_document",
        id:selectedDeleteId
    }));

    closeDeleteModal();
}

function closeShareModal() {
    document.getElementById("share-modal").style.display = "none";
}

function copyShareLink() {
    const input = document.getElementById("share-link");
    input.select();
    input.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(input.value);

    alert("Link berhasil disalin!");
}

function closeProfileModal(){
    document.getElementById("profile-modal").style.display = "none";
}

function saveProfile(){
    socket.send(JSON.stringify({
        type: "update_profile",
        username: document.getElementById("profile-username").value,
        fullname: document.getElementById("profile-fullname").value,
        bio: document.getElementById("profile-bio").value,
        avatar: ""
    }));

    closeProfileModal();
    alert("Profile updated");
}

function changeTextColor(){
    const color = document.getElementById("font-color").value;
    document.execCommand("foreColor", false, color);
}

function changeHighlight(){
    const color = document.getElementById("highlight-color").value;
    document.execCommand("hiliteColor", false, color);
}

function insertImage(){
    document.getElementById("image-modal").style.display = "flex";
}

function closeImageModal(){
    document.getElementById("image-modal").style.display = "none";
}

function insertImageNow(){
    const url = document.getElementById("image-url").value;

    if(url){
        document.execCommand("insertImage", false, url);
    }

    closeImageModal();
}

function changeFontSize(){
    const size = document.getElementById("font-size").value;
    document.execCommand("fontSize", false, size);
}

function openCommentModal(){
    document.getElementById("comment-modal").style.display = "flex";
}

function closeCommentModal(){
    document.getElementById("comment-modal").style.display = "none";
}

function saveComment(){
    const comment = document.getElementById("comment-text").value;

    socket.send(JSON.stringify({
        type:"comment",
        username,
        comment
    }));

    closeCommentModal();
}

function showVersions(){
    window.location.href =
        `version-history.html?id=${currentDocId}`;
}

let lastActivity = Date.now();

document.addEventListener("mousemove", ()=>{
    lastActivity = Date.now();
});