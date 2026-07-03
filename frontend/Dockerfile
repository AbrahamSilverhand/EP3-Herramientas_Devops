FROM nginx:alpine

# Eliminar configuración y contenido por defecto
RUN rm -rf /usr/share/nginx/html/*
RUN rm /etc/nginx/conf.d/default.conf

# Copiar la configuración personalizada de Nginx (con proxy /api/)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos (excluyendo Dockerfile/nginx.conf vía .dockerignore si existe)
COPY . /usr/share/nginx/html

EXPOSE 80