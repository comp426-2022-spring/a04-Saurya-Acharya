const http = require('http')

// Require Express.js
const express = require("express")
const app = express()
const db = require("./database.js");
const morgan = require('morgan');
const args = require('minimist')(process.argv.slice(2))

app.use(express.urlencoded({extended: true}));
app.use(express.json());

if (args.help || args.h) {
  console.log('--port     Set the port number for the server to listen on. Must be an integer between 1 and 65535.\n')
  console.log('--debug    If set to `true`, creates endlpoints /app/log/access/ which returns a JSON access log from the database and /app/error which throws an error with the message "Error test successful." Defaults to `false`.\n')
  console.log('--log      If set to false, no log files are written. Defaults to true. Logs are always written to database.\n')
  console.log('--help     Return this message and exit.')
  process.exit(0)
}

args['port']
args['debug'] 
args['log']
args['help']
const port = args.port || process.env.port || 5555
const debug = args.debug || 'false'
const log = args.log || 'true'

if (log == 'true') {
  const WRITESTREAM = fs.createWriteStream('access.log', { flags: 'a' });
  app.use(morgan('combined'), { stream: WRITESTREAM });
} 

// Start an app server
const server = app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%',port))
});


app.use( (req, res, next) => {
  let logdata = {
      remoteaddr: req.ip,
      remoteuser: req.user,
      time: Date.now(),
      method: req.method,
      url: req.url,
      protocol: req.protocol,
      httpversion: req.httpVersion,
      secure: req.secure,
      status: res.statusCode,
      referer: req.headers['referer'],
      useragent: req.headers['user-agent']
    }
  const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url,  protocol, httpversion, secure, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const info = stmt.run(logdata.remoteaddr.toString(), logdata.remoteuser, logdata.time, logdata.method.toString(), logdata.url.toString(), logdata.protocol.toString(), logdata.httpversion.toString(), logdata.secure.toString(), logdata.status.toString(), logdata.referer, logdata.useragent.toString())
  next();
})

if (debug){
  app.get('/app/log/access/', (req, res, next) => {
  const stmt = db.prepare('SELECT * FROM accessLog').all();
  res.status(200).json(stmt);
  })
  app.get('/app/error/', (req, res, next) => {
    throw new Error('Error');
  })
}

//---> If things break

app.get("/app/", (req, res) => {
  res.status(200).end("OK");
  res.type("text/plain");
});

app.get('/app/flip', (req, res) => {
  var flip = coinFlip()
  res.status(200).json({
      'flip': flip
  })
})

app.get('/app/flips/:number', (req, res) => {
  var rawFlips = coinFlips(req.params.number)
  var summaryFlips = countFlips(rawFlips)
  res.status(200).json({
      'raw': rawFlips,
      'summary': summaryFlips
  })
});

app.get('/app/flip/call/heads', (req, res) => {
  res.status(200).json(flipACoin('heads'))
})

app.get('/app/flip/call/tails', (req, res) => {
  res.status(200).json(flipACoin('tails'))
})

// Default response for any other request
app.use(function(req, res){
  res.status(404).send('404 NOT FOUND')
});


/*Coin Functions*/

function coinFlip() {
  var x = (Math.round(Math.random()) == 0);
  if(x){
    return "heads";
  }else{
    return "tails";
  }
}

function coinFlips(flips) {
  let flipsList = [];
  for (let i = 0; i< flips; i++){
    flipsList.push(coinFlip())
  }
  return flipsList;
}

function countFlips(array) {
  var count;
  let tails = 0;
  let heads = 0;

  for (let i = 0; i< array.length; i++){
    if (array[i] == "heads"){
      heads+=1;
    }
    else{
      tails+=1;
    }
  }

  if (tails == 0) {
    count = { heads };
  } else if (heads == 0) {
    count = { tails };
  } else {
    count = { tails, heads };
  }

  return count;
}

function flipACoin(call) {
  let aCoinFlip = coinFlip()
  let resulting = {
    call: call,
    flip: aCoinFlip,
    result: ""
  }

  if (resulting.call == aCoinFlip){
    resulting.result = "win";
  }
  else{
    resulting.result = "lose";
  }

  return resulting
}