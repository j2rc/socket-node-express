/** Server */
const express = require('express');
require('dotenv').config();
const app = express();
const http = require('http');
const server = http.createServer(app);
const createError = require('http-errors');

/** Sockets.IO */
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    //origin: "*" //allowing cors from anywhere
    origin: process.env.BASE_URL,
    credentials: true
  }
});

/** Utils */
const cors = require('cors');
const morgan = require('morgan');

/** Routes wrapper */
const { validateSessionRouter } = require('./routes/api.validation')
var wrapperRouter = require('./routes/api.route')
var wrapperAdmin = require('./routes/admin.route')

/** Validation utils */
const { validateSession } = require('./lib/validateSession')

var corsOptions = {
  origin: process.env.BASE_URL,
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
}

app.use((req, res, next) => {

  /*
  if ( !req.headers?.origin ) {
    next(createError.NotFound());
  }
  console.log(req.headers)
  console.log("req.socket.remoteAddress")
  console.log(req.socket.remoteAddress)
  console.log("req.ip")
  console.log(req.ip)
  */

  next()
});

app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({response: 'success'});
});

//app.use('/api', require('./routes/api.route'));
app.use('/api', cors(corsOptions), validateSessionRouter(), wrapperRouter(io));

app.use('/admin', cors(corsOptions), validateSessionRouter(), wrapperAdmin(io));

app.use((req, res, next) => {
  next(createError.NotFound());
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    status: err.status || 500,
    message: err.message,
  });
});

io.use((socket, next) => {
  
  next()
  /* 
  if (isValid(socket.request)) {
    next();
  } else {
    next(new Error("invalid"));
  }
  */
});

io.use( async (socket, next) => {
  const session = await validateSession(socket.request)
  if (session && session?.user._id == socket.handshake.query._id) {
    socket.user = session.user;
    next();
  } else {
    next(new Error("unknown user"));
  }
});

io.on('connection', (socket) => {
  console.log(`Connected user with _id: ${socket.handshake.query._id}`);
  console.log(`on connection con socketuse: ${JSON.stringify(socket.user)}`)
  socket.join(socket.handshake.query._id);

  socket.onAny((event, ...args) => {
    console.log(event, args);
  });
  socket.on('disconnect', () => {
    console.log(`Disconnected user with _id: ${socket.handshake.query._id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 @ http://localhost:${PORT}`));