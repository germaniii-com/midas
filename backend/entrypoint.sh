#!/bin/sh
set -e

if [ -d "/data" ]; then
  chown -R 1000:1000 /data
fi

exec "$@"
