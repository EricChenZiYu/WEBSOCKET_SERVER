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
    MIN_FRAME_SIZE:2,
    MEDIUM_DATA_FLAG:126,
    LARGE_DATA_FLAG:127,
    MEDIUM_SIZE_CONSUMPTION:2,
    LARGE_SIZE_CONSUMPTION:8,
    MASK_KEY_LENGTH:4,

    OPCODE_TEXT: 0x01,
    OPCODE_BINARY: 0x02,
    OPCODE_CLOSE: 0x08,
    OPCODE_PING: 0x09,
    OPCODE_PONG: 0x0A,

}