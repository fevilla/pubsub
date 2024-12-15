const express = require('express');
const { redisClient, getRoomFromCache, addMessageToCache } = require('./redis');
const http = require('http');
const socketIo = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const cors = require('cors'); // Para manejar CORS

const app = express();
const server = http.createServer(app);  // Crea el servidor HTTP a partir de la aplicación Express
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',  // Permite que la aplicación frontend se conecte
    methods: ['GET', 'POST'],
  }
});
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

  // Room predeterminado al que se unirá cada nuevo cliente
  const defaultRoom = 'generalRoom';  // Cambia el nombre del room si lo deseas
  socket.join(defaultRoom);  // El cliente se une al room predeterminado

  // Emitir un mensaje de bienvenida cuando el cliente se conecta
  io.in(defaultRoom).emit('notification', {
    title: "Someone's here",
    description: 'A new user just entered the room',
  });

  // Recuperar el historial de mensajes del room (si existe)
  const messages = getRoomFromCache(defaultRoom);
  socket.emit('messageHistory', messages);  // Enviar el historial de mensajes al cliente

  // Agregar un listener para el evento "sendMessage"
  socket.on('sendMessage', (message, callback) => {
    const msg = { user: 'Anonymous', text: message };  // Nombre de usuario genérico, puedes cambiarlo si lo necesitas
    io.in(defaultRoom).emit('message', msg);  // Enviar el mensaje a todos los usuarios en el room
    addMessageToCache(defaultRoom, msg);  // Almacenar el mensaje en Redis
    callback();  // Confirmar que el mensaje fue enviado
  });

  // Manejador de desconexión
  socket.on('disconnect', () => {
    console.log('WebSocket client disconnected');
    io.in(defaultRoom).emit('notification', {
      title: 'Someone just left',
      description: 'A user just left the room',
    });
  });
});

// Ruta para probar el servicio
app.get('/', (req, res) => {
  res.send('WebSocket and Pub/Sub App');
});

// Middleware para analizar JSON
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' })); // Permitir acceso desde localhost:3000


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

  // Emitir a todos los clientes WebSocket conectados
  io.emit('pubsubMessage', `Hello ${name}!`);

  // Responder a Pub/Sub con un código 204 para indicar que la solicitud fue exitosa
  res.status(204).send();
});

// Asegúrate de que el servidor esté escuchando en el puerto correcto
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`App is listening on port ${PORT}`);
});

module.exports = server;
