/**
 * 1. grab the incoming http request data
 * 2. calculate the server sec-websocket-accept value
 * 3. send back appropriate headers to establish a valid websocket connection
 *
 */
const HTTP = require("node:http");

const CONSTANTS = require("./custom_lib/websocket_constants.js");
const FUNCTIONS = require("./custom_lib/websocket_methods.js");

const HTTP_SERVER = HTTP.createServer((req, res) => {
  res.writeHead(200);
  res.end("Hello,Hope enjoy under-the-hood websocket implementtation");
});

HTTP_SERVER.listen(CONSTANTS.PORT, () => {
  console.log(`the http server is lstening on port ${CONSTANTS.PORT}`);
});

CONSTANTS.CUSTOM_ERRORS.forEach((errorEvent) => {
  process.on(errorEvent, (err) => {
    console.log(
      `caught an eror event: ${errorEvent}.Here's tje error object ${err}`
    );
    process.exit(1);
  });
});

HTTP_SERVER.on("upgrade", (req, socket, head) => {
  const upgradeHeaderCheck =
    req.headers["upgrade"].toLowerCase() === CONSTANTS.UPGRADE;
  const connectionHeaderCheck =
    req.headers["connection"].toLowerCase() === CONSTANTS.CONNECTION;
  const methodHeaderCheck = req.method === CONSTANTS.METHOD;

  const origin = req.headers["origin"];
  const originCheck = FUNCTIONS.isOriginAllowed(origin);

  if (
    FUNCTIONS.check(
      upgradeHeaderCheck,
      connectionHeaderCheck,
      methodHeaderCheck,
      originCheck
    )
  ) {
    upgradeConnection(req, socket, head);
  } else {
    // throw new Error("Can't connect.The HTTP headers are not in accorance with the RFC 6455 spec.")

    const message =
      "400 bad request.The HTTP headers do not comply with the RFC6455 spec.";
    const messageLength = message.length;
    const response = `HTTP/1.1 400 bad request
    Content-Type: text/plain
    Content-Length: ${messageLength}

    ${message}
    `;
    socket.write(response);
    socket.end();
  }
});

function upgradeConnection(req, socket, head) {
  console.log("all checks completed");
  const clientKey = req.headers["sec-websocket-key"];
  const responseHeaders = FUNCTIONS.createUpgradeHeaders(clientKey);

  socket.write(responseHeaders);

  startWebsocketConnection(socket);
}

function startWebsocketConnection(socket) {
  const receiver = new WebsocketReceiver(socket);

  socket.on("data", (data) => {
    receiver.processBuffer(data);
  });
  socket.on("end", (data) => {
    console.log(data, "connection ended");
  });
}

const GET_INFO = 1;
const GET_LENGTH = 2;
const GET_MASK_KEY = 3;
const GET_PAYLOAD = 4;
const SEND_ECHO = 5;

class WebsocketReceiver {
  _buffersArray = [];
  _socket;
  _bufferedBytesLength = 0;
  _taskLoop = false;
  _task = GET_INFO;
  _fin = false;
  _opcode = null;
  _masked = false;
  _initialPayloadSizeIndicator = 0;
  _framePayloadLength = 0;
  _maxPayload = 1024 * 1024;
  _totalPayloadLength = 0;
  _clientMaskKey = Buffer.alloc(CONSTANTS.MASK_KEY_LENGTH);
  _framesReceived = 0;
  _fragments = []; // store fragments (frames) for reassembly

  constructor(socket) {
    this._socket = socket;
  }
  processBuffer(buffer) {
    this._buffersArray.push(buffer);
    console.log(buffer.length, "buffer.length");
    
    this._bufferedBytesLength += buffer.length;
    this._startTasksLoop();
  }
  _startTasksLoop() {
    this._taskLoop = true; //want to create a loop to complete numerous tasks, and also eventually to deal with fragmented data.
    //eventually set taskLoop to false when all the tasks are completed.
    do {
      switch (this._task) {
        // Task 1: get  INFO grab the 2 first bytes of our WS frame  --fin rev1 rsv2 rsv3 op mask length
        case GET_INFO: // 2 bytes of header data 4 bytes masking key and payload
          this._getInfo(); // to get info about the ws data received (WS bianry frame format)
          break;
        // TASK 2: get  Length  calculate the size of the payload -- length
        case GET_LENGTH:
          this._getLength();
          break;
        // TASK 3: get  Mask extract the masking key -- masking key
        case GET_MASK_KEY:
          this._getMaskKey();
          break;
        // TASK 4: get  Payload Use  the masking key to XOR and extract  the actual payload data -- payload
        case GET_PAYLOAD:
          this._getPayload();
          break;
        case SEND_ECHO:
        default:
          break;
      }
    } while (this._taskLoop);
  }
  _getInfo() {
    if (this._bufferedBytesLength < CONSTANTS.MIN_FRAME_SIZE) {
      this._taskLoop = false;
      return;
    }
    const infoBuffer = this._consumeHeaders(CONSTANTS.MIN_FRAME_SIZE);
    const firstByte = infoBuffer[0];
    const secondByte = infoBuffer[1];

    this._fin = (firstByte & 0b10000000) === 0b10000000;
    this._opcode = firstByte & 0b00001111;
    this._masked = (secondByte & 0b10000000) === 0b10000000;
    this._initialPayloadSizeIndicator = secondByte & 0b01111111;
    if (!this._masked) {
      throw new Error(
        "cannot extract payload data from a ws frame without a masking key"
      );
    }
    this._task = GET_LENGTH;
  }
  _consumeHeaders(n) {
    // reduce bufferedBytesLength by how many bytes we will consume ,goal is to have this get to 0
    this._bufferedBytesLength -= n;
    // if extraction is the same size as the actual buffer, return the entire buffer
    if (n === this._buffersArray[0].length) {
      return this._buffersArray.shift();
    }
    // if extraction is less than the actual buffer, return a slice of the buffer
    if (n < this._buffersArray[0].length) {
      const buffer = this._buffersArray[0].slice(0, n);
      this._buffersArray[0] = this._buffersArray[0].slice(n);
      return buffer;
    } else {
      throw new Error(
        "cannot extract more data from a ws frame than the actual frame size"
      );
    }
  }
  _getLength() {
    switch (this._initialPayloadSizeIndicator) {
      case CONSTANTS.MEDIUM_DATA_FLAG:
        let mediumPayloadLengthBuffer = this._consumeHeaders(
          CONSTANTS.MEDIUM_SIZE_CONSUMPTION
        );
        this._framePayloadLength = mediumPayloadLengthBuffer.readUInt16BE(0);
        break;
      case CONSTANTS.LARGE_DATA_FLAG:
        let largePayloadLengthBuffer = this._consumeHeaders(
          CONSTANTS.LARGE_SIZE_CONSUMPTION
        );
        let bufferBigInt = largePayloadLengthBuffer.readBigUInt64BE(0);
        this._framePayloadLength = Number(bufferBigInt);
        break;

      default:
        this._framePayloadLength = this._initialPayloadSizeIndicator;
        break;
    }
    this._processLength();
  }
  _processLength() {
    this._totalPayloadLength += this._framePayloadLength;
    if (this._totalPayloadLength > this._maxPayload) {
      throw new Error("payload is too large");
    }
    this._task = GET_MASK_KEY;
  }
  _getMaskKey() {
    this._clientMaskKey = this._consumeHeaders(CONSTANTS.MASK_KEY_LENGTH);
    this._task = GET_PAYLOAD;
  }
  _getPayload() {
    // have not yet received the entire payload, wait another data event fired on socket object in order to receie more data
    if (this._bufferedBytesLength < this._framePayloadLength) {
      this._taskLoop = false; // so as new data arrives, code inside of getPayload will be executed
      return;
    }
    // Full Frame received (there may be more frames if have a fragmented message)
    this._framesReceived++;
    // consumed the entire WS frame payload,
    let frameMaskedPayloadBuffer = this._consumePayload(
      this._framePayloadLength
    );

    //  unmask the full data frame
    let frameUnmaskedPayloadBuffer = FUNCTIONS._unmaskPayload(
      frameMaskedPayloadBuffer,
      this._clientMaskKey
    );

    if (this._opcode === CONSTANTS.OPCODE_CLOSE) {
      throw new Error("server has not dealt with connection closed");
    }


    if ([CONSTANTS.OPCODE_BINARY, CONSTANTS.OPCODE_PING,CONSTANTS.OPCODE_PONG].includes(this._opcode)) {
      throw new Error("server has not dealt with this type of frame");
    }




    // push decoded /unmasked data into out fragments array
    if (frameUnmaskedPayloadBuffer.length > 0) {
      this._fragments.push(frameUnmaskedPayloadBuffer);
    }
    // Check if more frames (fragments) are requierd
    // if fin is false, wait and process more data and get into to check its FIN state,OPCODE,etc
    if (!this._fin) {
      this._task = GET_INFO;
      return;
    }
    // if fin is true send  back to the client
    console.log(`Total frames received: ${this._framesReceived}`);
    console.log(`Total payload received: ${this._totalPayloadLength}`);
    this._task = SEND_ECHO;
  }
  _consumePayload(n) {
    // reduce bufferedBytesLength by how many bytes we will consume
    this._bufferedBytesLength -= n;
    const paylaodBuffer = Buffer.alloc(n); // cerate a new buffer for data we are yet to put into it
    let totalByteRead = 0; // keep track of how many bytes we have read into payloadBuffer

    // loop through the buffersArray and extract the payload data into the payloadBuffer until we have read n bytes to fill the payloadBuffer
    while (totalByteRead < n) {
      const buffer = this._buffersArray[0]; // retieve the first chunk of data from an array of chunks
      const bytesToRead = Math.min(n - totalByteRead, buffer.length); // calaulating the number of bytes to read from buf,ensuring that it does not exceddd the remaining bytes to reach n bytes into payloadBuffer
      buffer.copy(paylaodBuffer, totalByteRead, 0, bytesToRead);
      // update _buffersArray accordingly (either remove part of its first element or remove the entire first element)
      if (bytesToRead < buffer.length) {
        this._buffersArray[0] = buffer.slice(bytesToRead);
      } else {
        this._buffersArray.shift();
      }
      totalByteRead += bytesToRead;
    }

    return paylaodBuffer;
  }
}