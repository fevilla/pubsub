# Usa la imagen oficial ligera de Node.js
FROM node:20-slim

# Establece el directorio de trabajo
WORKDIR /usr/src/app

# Copia el archivo package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias
RUN npm install --omit=dev

# Copia el código fuente al contenedor
COPY . .

# Expone el puerto en el que la app va a escuchar
EXPOSE 8080

# Comando para iniciar la app
CMD [ "npm", "start" ]
