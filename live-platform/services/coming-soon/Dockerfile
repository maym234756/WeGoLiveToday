# services/coming-soon/Dockerfile
FROM nginx:alpine

# Nginx hardening + gzip + caching
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static assets
COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY app.js /usr/share/nginx/html/app.js
COPY favicon.svg /usr/share/nginx/html/favicon.svg
COPY robots.txt /usr/share/nginx/html/robots.txt
