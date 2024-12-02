const crypto = require("node:crypto");
const CONSTANTS = require("./websocket_constants");
function isOriginAllowed(origin) {
    return CONSTANTS.ALLOWED_ORIGINS.includes(origin);
}

function check(...checks) {
    return checks.every(x=>x === true);
}

function createUpgradeHeaders(clientKey) {
    const serverKey = generateServerKey(clientKey);
    let headers = [
        "HTTP/1.1 101 Switching Protocols",
        "Connection: Upgrade",
        "Upgrade: websocket",
        `Sec-WebSocket-Accept: ${serverKey}`
    ];
    const upgradeHeaders = headers.join("\r\n") + "\r\n\r\n";
    return upgradeHeaders;
}

function generateServerKey(clientKey) {
    let data = clientKey + CONSTANTS.GUID;
    const hash = crypto.createHash("sha1");
    hash.update(data);
    return hash.digest("base64");

}

module.exports = {
    isOriginAllowed,
    check,
    createUpgradeHeaders,
}