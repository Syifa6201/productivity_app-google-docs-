const WebSocket = require('ws');
const mysql = require('mysql2');

const wss = new WebSocket.Server({
    host: "0.0.0.0",
    port: 3000
});

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "realtime_docs"
});

let documentData = "";
let users = [];

db.connect((err) => {
    if (err) throw err;
    console.log("MySQL Connected");

    db.query("SELECT * FROM documents WHERE id=1", (err, result) => {
        if (err) throw err;
        documentData = result[0].content;
    });
});

console.log("WebSocket running on port 3000");

function broadcastUsers() {
    const userList = users.map(u => u.username);

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: "users",
                users: userList
            }));
        }
    });
}

function broadcastTyping(username) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: "typing",
                username
            }));
        }
    });
}

wss.on('connection', function connection(ws) {
    console.log("Client connected");

    ws.send(JSON.stringify({
        type: "document",
        content: documentData
    }));

    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);

        if (data.type === "join") {
            ws.username = data.username;

            users.push({
                username: data.username,
                socket: ws
            });

            broadcastUsers();
        }

        if (data.type === "edit") {
            documentData = data.content;

            db.query(
                "UPDATE documents SET content=? WHERE id=1",
                [documentData]
            );

            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: "document",
                        content: documentData
                    }));
                }
            });
        }

        if (data.type === "typing") {
            broadcastTyping(data.username);
        }

        if (data.type === "chat") {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: "chat",
                        username: data.username,
                        message: data.message
                    }));
                }
            });
        }
    });

    ws.on('close', () => {
        users = users.filter(user => user.socket !== ws);
        broadcastUsers();
    });
});