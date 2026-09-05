#!/bin/sh
set -eu
rm -f /etc/nginx/conf.d/default.conf
if [ -f /etc/nginx/ssl/live/petro.aria-ai.ir/fullchain.pem ]; then
  cp /etc/nginx/templates/ssl.conf /etc/nginx/conf.d/app.conf
else
  cp /etc/nginx/templates/http.conf /etc/nginx/conf.d/app.conf
fi
exec nginx -g 'daemon off;'
