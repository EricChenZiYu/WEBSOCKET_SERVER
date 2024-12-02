module.exports = {
    PORT:8080,
    CUSTOM_ERRORS:[
        "uncaughtException",
        "unhandledRejection",
        "SIGINT",
    ],
    // upgrade checks
    METHOD:"GET",
    VERSION: "13",
    CONNECTION:"upgrade",
    UPGRADE:"websocket",
    ALLOWED_ORIGINS:[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        'null',//allow to use file protocal to view html and establish a WS connection
    ],
    GUID:"258EAFA5-E914-47DA-95CA-C5AB0DC85B11",

}