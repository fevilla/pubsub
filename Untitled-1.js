// Importa dependencias necesarias
const express = require('express');
const { redisClient, getRoomFromCache, addMessageToCache } = require('./redis');
const http = require('http');
const socketIo = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

// Crea la aplicación Express y el servidor HTTP
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configura Redis como el adaptador para Socket.IO
const subClient = redisClient.duplicate();
io.adapter(createAdapter(redisClient, subClient));

// Manejadores de errores para Redis
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err.message);
});

subClient.on('error', (err) => {
  console.error('Redis Sub Client Error:', err.message);
});

// Manejador de nueva conexión WebSocket
io.on('connection', (socket) => {
  console.log('New WebSocket connection');
  
  // Manejador para el evento "signin"
  socket.on('signin', async ({ user, room }, callback) => {
    // Lógica para manejar inicio de sesión de usuario
    callback(`Welcome ${user} to room ${room}`);
  });

  // Manejador para el evento "updateSocketId"
  socket.on('updateSocketId', async ({ user, room }) => {
    // Lógica para actualizar el ID de socket
  });

  // Manejador para el evento "sendMessage"
  socket.on('sendMessage', (message, callback) => {
    // Enviar el mensaje a todos los usuarios conectados
    io.emit('pubsubMessage', message);
    callback('Message sent');
  });

  // Manejador para desconexión
  socket.on('disconnect', () => {
    console.log('WebSocket client disconnected');
  });
});

// Ruta para probar el servicio
app.get('/', async (req, res) => {
  res.send('WebSocket and Pub/Sub App');
});

// Middleware para analizar JSON
app.use(express.json());

// Manejador de mensajes de Pub/Sub
app.post('/', (req, res) => {
  if (!req.body || !req.body.message) {
    const msg = 'Invalid Pub/Sub message format';
    console.error(`Error: ${msg}`);
    res.status(400).send(`Bad Request: ${msg}`);
    return;
  }

  const pubSubMessage = req.body.message;
  const name = pubSubMessage.data
    ? Buffer.from(pubSubMessage.data, 'base64').toString().trim()
    : 'World';

  console.log(`Received Pub/Sub message: ${name}`);
  io.emit('pubsubMessage', `Hello ${name}!`);  
  res.status(204).send();
});

module.exports = server;
