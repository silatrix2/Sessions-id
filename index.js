const express = require('express');
const path = require('path');
const app = express();

const __path = process.cwd(); // current working directory
const bodyParser = require('body-parser');

// increase listeners early if you need it
require('events').EventEmitter.defaultMaxListeners = 500;

// Load modules (assumes these export express routers or middleware)
let server = require('./qr');
let code = require('./pair');

const PORT = process.env.PORT || 8000;

// parse request bodies BEFORE routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// serve static assets if you have a public folder (optional)
// place css, js, images in a 'public' folder
app.use(express.static(path.join(__path, 'public')));

// mount routers (if server and code are routers)
app.use('/server', server);
app.use('/code', code);

// simple GET handlers to serve HTML files
app.get('/pair', (req, res) => {
  res.sendFile(path.join(__path, 'pair.html'));
});

app.get('/qr', (req, res) => {
  res.sendFile(path.join(__path, 'qr.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__path, 'main.html'));
});

// start server
app.listen(PORT, () => {
  console.log(`
Don't Forget To Give Star 𝚂𝙸𝙻𝙰𝚃𝚁𝙸𝚇-𝙼𝙳

Server running on http://localhost:${PORT}
`);
});

module.exports = app;
