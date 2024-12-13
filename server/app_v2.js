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

HTTP_SERVER.on("upgrade",(req, socket, head)=>{
  const upgradeHeaderCheck = req.headers["upgrade"].toLowerCase() === CONSTANTS.UPGRADE;
  const connectionHeaderCheck = req.headers["connection"].toLowerCase() === CONSTANTS.CONNECTION;
  const methodHeaderCheck = req.method === CONSTANTS.METHOD;

  const origin = req.headers["origin"];
  const originCheck = FUNCTIONS.isOriginAllowed(origin);

  if (FUNCTIONS.check(upgradeHeaderCheck,connectionHeaderCheck, methodHeaderCheck,originCheck)) {
    upgradeConnection(req, socket, head);
  } else {
    // throw new Error("Can't connect.The HTTP headers are not in accorance with the RFC 6455 spec.")

    const message = "400 bad request.The HTTP headers do not comply with the RFC6455 spec.";
    const messageLength = message.length;
    const response = `HTTP/1.1 400 bad request
    Content-Type: text/plain
    Content-Length: ${messageLength}

    ${message}
    `;
    socket.write(response);
    socket.end();
  }

})


function upgradeConnection(req, socket, head) {
  console.log("all checks completed");
  const clientKey = req.headers["sec-websocket-key"];
  const responseHeaders = FUNCTIONS.createUpgradeHeaders(clientKey);

  socket.write(responseHeaders);

  startWebsocketConnection(socket);
  
}

function startWebsocketConnection(socket) {
  
}