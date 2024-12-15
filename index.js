// Importa el servidor Express desde app.js
const server = require('./app');  // 'app.js' debería ser tu servidor Express
const { redisClient } = require('./redis');

// Verifica si el puerto está disponible en el entorno (Google Cloud Run lo provee)
const PORT = parseInt(process.env.PORT) || 8080;  // Define el puerto de escucha

// Asegúrate de que la llamada a listen() solo suceda una vez
if (server.listening) {
  console.log(`Server is already listening on port ${PORT}`);
} else {
  server.listen(PORT, () => {
    console.log(`App is listening on port ${PORT}`);
  });
}

// Manejar señales de término (como SIGTERM) para limpiar la conexión a Redis
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, closing Redis connection...');
  redisClient.quit();  // Cierra la conexión de Redis
  process.exit(0);  // Termina el proceso con éxito
});

module.exports = server;
