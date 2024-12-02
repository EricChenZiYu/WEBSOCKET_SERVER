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
