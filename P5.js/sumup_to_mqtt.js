/* jshint esversion: 8 */

// general parameters
let query_period = 700;    // in ms

// sumup api parameters
// because of CORS-blocking, the api requests need to be proxied. more info:
// https://github.com/garmeeh/local-cors-proxy
let api_proxy_url = "http://localhost:8010/proxy";  // url to proxy: https://api.sumup.com
let access_token = "enter-secret-token-here";

// MQTT parameters
let broker = {
    hostname: '127.0.0.1',
    port: 1884
};
let creds = {
    clientID: 'sumup',
    userName: '192.168.1.2',
    password: ''
};


// internal variables
let last_transaction_time = Date.now();
access_token = "Bearer " + access_token;
let transactions_url = api_proxy_url + "/v0.1/me/transactions/history";
let token_url = api_proxy_url + "/token";
let last_query = 0;
let data;
let reply;


// callback function on successful HTTP request
function HTTP_return(data) {
  console.log("request succeeded.");
  reply = 1;
}

// callback function on failed HTTP request
function HTTP_error(data) {
  console.log("request failed.");
  reply = 0;
}


// queries the api for the last transaction and compares it with the known last time
async function query_last_transaction() {
  let query = await httpDo(
    transactions_url + "?order=descending&limit=1&status=SUCCESSFUL",
    {
      method: "GET",
      headers: { authorization: access_token}
    },
    HTTP_return,
    HTTP_error
  )
  .catch(data => reply = 0);
  
  if(reply == 0) {
    console.log("api request failed.");
  } else {
    data = JSON.parse(query);
    let timestamp = Date.parse(data.items[0].timestamp);
    // is the payment we got newer than last time we checked?
    if (timestamp > last_transaction_time) {
      console.log("NEW payment arrived.");
      send_mqtt(1, "tighten");
      last_transaction_time = timestamp;
    // if it has the same timestamp, it is still the same payment.
    } else if (timestamp == last_transaction_time) {
      // no new payment. do nothing.
    // if it is older, then we have not yet checked for payments since startup. take the result as new trigger value.
    } else {
      console.log("this seems to be the first startup. activating trigger...");
      last_transaction_time = timestamp;
    }
  }
}


function setup() {
  client = new Paho.MQTT.Client(broker.hostname, broker.port, creds.clientID);
  client.onConnectionLost = on_connection_lost;
  client.onMessageArrived = on_message_arrived;
  client.connect({
            onSuccess: on_connect,      // callback function for when you connect
            userName: creds.userName,   // username
            password: creds.password,   // password
            useSSL: false               // use SSL
  });
}


function draw() {
  if(millis() - last_query > query_period){
    query_last_transaction();
    last_query = millis();
  }
}


// called when the client connects
function on_connect() {
  console.log("connected to MQTT broker at " + broker.hostname + ":" + broker.port);
}

// called when the client loses its connection
function on_connection_lost(response) {
  console.log("connection to MQTT broker lost.");
    if (response.errorCode !== 0) {
        console.log(response.errorMessage);
    }
}

// called when a message arrives
function on_message_arrived(message) {
  console.log("message arrived, i don't care though.");
  console.log(message);
}


// send a MQTT message msg to topic tpc
function send_mqtt(msg, tpc) {
    // if the client is connected to the MQTT broker:
    if (client.isConnected()) {
        // start an MQTT message:
        message = new Paho.MQTT.Message(JSON.stringify(msg));
        // choose the destination topic:
        message.destinationName = tpc;
        // send it:
        client.send(message);
    }
}
