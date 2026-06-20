const username = prompt("Masukkan username:");
const socket = new WebSocket(`ws://${window.location.hostname}:3000`);

socket.onopen = () => {
    console.log("WS CONNECTED");

    socket.send(JSON.stringify({
        type: "join",
        username
    }));
};

socket.onerror = (e) => {
    console.log("WS ERROR", e);
};

socket.onclose = () => {
    console.log("WS CLOSED");
};

const editor = document.getElementById("editor");
const chatBox = document.getElementById("chat-box");
const usersBox = document.getElementById("users-box");
const typingIndicator = document.getElementById("typing-indicator");
const avatar = document.getElementById("avatar");

let notifCount = 0;

avatar.innerText = username.charAt(0).toUpperCase();

socket.onopen = () => {
    socket.send(JSON.stringify({
        type: "join",
        username
    }));
};

editor.addEventListener("input", () => {
    document.getElementById("save-status").innerText = "Saving...";

    socket.send(JSON.stringify({
        type: "typing",
        username
    }));

    socket.send(JSON.stringify({
        type: "edit",
        content: editor.innerHTML
    }));

    setTimeout(() => {
    document.getElementById("save-status").innerText = "Saved";
    addNotification("Document saved");
}, 800);
});

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "document") {
        editor.innerHTML = data.content;
    }

    if (data.type === "chat") {
        addNotification(`${data.username} sent a message`);

        chatBox.innerHTML += `
            <div class="chat-bubble">
                <b>${data.username}</b><br>
                ${data.message}
            </div>
        `;
        
    }

    if (data.type === "users") {
        addNotification("Collaborator updated");

        usersBox.innerHTML = "";

        data.users.forEach(user => {
            usersBox.innerHTML += `
                <p><span style="color:green;">●</span> ${user}</p>
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
};

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
        content: editor.innerHTML
    }));
}

function shareDocument() {
    alert("Share this link to collaborators:\nhttp://localhost/realtime_app");
}

function addNotification(message) {
    notifCount++;

    document.getElementById("notif-count").innerText = notifCount;

    const list = document.getElementById("notification-list");

    list.innerHTML =
        `<div class="notif-item">${message}</div>` + list.innerHTML;
}

function toggleNotificationPanel() {
    document
        .getElementById("notification-panel")
        .classList.toggle("show");
}

function showProfile() {
    alert("Profile\nUsername: " + username);
}