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

let users = [];

db.connect((err) => {
    if (err) throw err;
    console.log("MySQL Connected");
});

console.log("WebSocket running on port 3000");

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

function broadcastUsers() {
    broadcast({
        type: "users",
        users: users
    });
}

function saveNotification(message) {
    db.query(
        "INSERT INTO notifications(message) VALUES(?)",
        [message],
        (err) => {
            if (err) console.log(err);
        }
    );
}

wss.on('connection', (ws, req) => {
    console.log("Client connected from:", req.socket.remoteAddress);

    ws.on('message', (message) => {
    try {
        console.log("RAW:", message.toString());

        const data = JSON.parse(message);
        console.log("DATA:", data);

        
        if (data.type === "register") {
            console.log("REGISTER MASUK:", data);

            db.query(
                "INSERT INTO users(username,password) VALUES(?,?)",
                [data.username, data.password],
                (err) => {
                    if (err) {
                        console.log("SQL ERROR:", err);

                        ws.send(JSON.stringify({
                            type: "register_result",
                            success: false
                        }));
                        return;
                    }

                    console.log("REGISTER BERHASIL");

                    ws.send(JSON.stringify({
                        type: "register_result",
                        success: true
                    }));
                }
            );
        }

        if (data.type === "login") {
            db.query(
                "SELECT * FROM users WHERE username=? AND password=?",
                [data.username, data.password],
                (err, result) => {
                    if (err) return console.log(err);

                    ws.send(JSON.stringify({
                        type: "login_result",
                        success: result.length > 0,
                        username: data.username
                    }));
                }
            );
        }
    
        // JOIN
        if (data.type === "join") {
            ws.username = data.username;

            users = users.filter(
                user => user.username !== data.username
            );

            users.push({
                username: data.username,
                socket: ws,
                status: "online"
            });

            broadcastUsers();

            saveNotification(`${data.username} joined`);

            broadcast({
                type: "notification",
                message: `${data.username} joined`
            });
        }

        // GET DOCUMENT LIST
        if (data.type === "get_documents") {
            db.query(
                "SELECT id,title FROM documents ORDER BY id DESC",
                (err, results) => {
                    if (err) return console.log(err);

                    ws.send(JSON.stringify({
                        type: "documents",
                        documents: results
                    }));
                }
            );
        }

        // OPEN DOCUMENT
        if (data.type === "open_document") {
            db.query(
                "SELECT * FROM documents WHERE id=?",
                [data.id],
                (err, result) => {
                    if (err) return console.log(err);

                    if (result.length > 0) {
                        ws.send(JSON.stringify({
                            type: "document",
                            id: result[0].id,
                            title: result[0].title,
                            content: result[0].content
                        }));
                    }
                }
            );
        }

        // CREATE DOCUMENT
        if (data.type === "new_document") {
            console.log("CREATE DOC:", data.title);

            db.query(
                "INSERT INTO documents(title, content) VALUES(?, ?)",
                [data.title, ""],
                (err) => {
                    if (err) {
                        console.log("INSERT ERROR:", err);
                        return;
                    }

                    console.log("DOCUMENT SAVED");

                    db.query(
                        "SELECT id, title FROM documents ORDER BY id DESC",
                        (err, results) => {
                            if (err) {
                                console.log(err);
                                return;
                            }

                            broadcast({
                                type: "documents",
                                documents: results
                            });
                        }
                    );
                }
            );
        }

        // EDIT DOCUMENT
        // EDIT DOCUMENT
if (data.type === "edit") {
    console.log("EDIT RECEIVED:", data);

    db.query(
        "UPDATE documents SET content=? WHERE id=?",
        [data.content, data.id],
        (err) => {
            if (err) {
                console.log("DOCUMENT UPDATE ERROR:", err);
                return;
            }
        }
    );

    db.query(
        "INSERT INTO versions(document_id, content, created_at) VALUES(?,?,NOW())",
        [data.id, data.content],
        (err, result) => {
            if (err) {
                console.log("VERSION INSERT ERROR:", err);
            } else {
                console.log("VERSION SAVED:", result.insertId);
            }
        }
    );

    broadcast({
        type: "document",
        id: data.id,
        content: data.content
    });
}

        // TYPING
        if (data.type === "typing") {
            broadcast({
                type: "typing",
                username: data.username
            });
        }

        // CHAT
        if (data.type === "chat") {
            db.query(
                "INSERT INTO chats(username,message) VALUES(?,?)",
                [data.username, data.message],
                (err) => {
                    if (err) console.log(err);
                }
            );

            broadcast({
                type: "chat",
                username: data.username,
                message: data.message
            });

            saveNotification(`${data.username} sent a message`);
        }

        // PROFILE
        if (data.type === "get_profile") {
            db.query(
                "SELECT * FROM users_profile WHERE username=?",
                [data.username],
                (err, result) => {
                    if (err) return console.log(err);

                    ws.send(JSON.stringify({
                        type: "profile",
                        profile: result[0] || {
                            username: data.username
                        }
                    }));
                }
            );
        }

        // UPDATE PROFILE
        if (data.type === "update_profile") {
            db.query(
                `INSERT INTO users_profile(username,fullname,bio,avatar)
                 VALUES(?,?,?,?)
                 ON DUPLICATE KEY UPDATE
                 fullname=?,
                 bio=?,
                 avatar=?`,
                [
                    data.username,
                    data.fullname,
                    data.bio,
                    data.avatar,
                    data.fullname,
                    data.bio,
                    data.avatar
                ],
                (err) => {
                    if (err) console.log(err);
                }
            );
        }

        // CURSOR
        if (data.type === "cursor") {
            wss.clients.forEach(client => {
                if (
                    client !== ws &&
                    client.readyState === WebSocket.OPEN
                ) {
                    client.send(JSON.stringify({
                        type: "cursor",
                        username: data.username,
                        position: data.position
                    }));
                }
            });
        }

        if (data.type === "rename_document") {
            db.query(
                "UPDATE documents SET title=? WHERE id=?",
                [data.title, data.id],
                (err) => {
                    if (err) return console.log(err);

                    db.query(
                        "SELECT id,title FROM documents ORDER BY id DESC",
                        (err, results) => {
                            broadcast({
                                type: "documents",
                                documents: results
                            });
                        }
                    );
                }
            );
        }

        if(data.type==="get_versions"){
            console.log("GET VERSION FOR DOC:", data.id);

            db.query(
                "SELECT * FROM versions WHERE document_id=? ORDER BY id DESC",
                [data.id],
                (err,result)=>{
                    if(err){
                        console.log("GET VERSION ERROR:", err);
                        return;
                    }

                    console.log("VERSIONS FOUND:", result.length);

                    ws.send(JSON.stringify({
                        type:"versions",
                        versions: result || []
                    }));
                }
            );
        }

        if(data.type==="rollback"){
        db.query(
            "SELECT * FROM versions WHERE id=?",
            [data.versionId],
            (err,result)=>{
                if(err) return console.log(err);

                if(result.length>0){
                    const version = result[0];

                    db.query(
                        "UPDATE documents SET content=? WHERE id=?",
                        [version.content, version.document_id],
                        (err)=>{
                            if(err) return console.log(err);

                            ws.send(JSON.stringify({
                                type:"rollback_success"
                            }));

                            broadcast({
                                type:"document",
                                id: version.document_id,
                                content: version.content
                            });
                        }
                    );
                }
            }
        );
    }

        if (data.type === "delete_document") {
            db.query(
                "DELETE FROM documents WHERE id=?",
                [data.id],
                (err) => {
                    if (err) return console.log(err);

                    db.query(
                        "SELECT id,title FROM documents ORDER BY id DESC",
                        (err, results) => {
                            broadcast({
                                type: "documents",
                                documents: results
                            });
                        }
                    );
                }
            );
        }

        if(data.type==="comment"){
            db.query(
                "INSERT INTO comments(username,comment) VALUES(?,?)",
                [data.username, data.comment]
            );

            broadcast({
                type:"comment",
                username:data.username,
                comment:data.comment
            });
        }

        
        } catch (err) {
        console.log("SERVER ERROR:", err);
    }
    });

    ws.on('close', (code, reason) => {
    users = users.filter(user => user.socket !== ws);
    broadcastUsers();
    console.log("Disconnected:", code, reason.toString());
});
});