Battle Flowers - Online Mobile Upload

Files:
- battle_flowers_online.html : game client
- server.js                 : Node.js WebSocket server
- package.json              : server dependency/config

IMPORTANT:
The HTML file is the mobile-friendly game client. The server.js file must be
run on a Node.js hosting service; opening server.js in a browser will not work.

Basic server steps:
1. Upload this ZIP to a Node.js hosting service.
2. Install dependencies: npm install
3. Start: npm start
4. Use the public HTTPS game URL for players.

The current online version is a prototype relay server. For public release,
make the server authoritative for HP, damage, abilities, and anti-cheat.
