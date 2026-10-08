#!/bin/sh
set -e
if [ "${YTDLP_AUTOUPDATE:-1}" = "1" ]; then
  pip3 install --no-cache-dir --break-system-packages -U -q "yt-dlp[default]" || echo "yt-dlp update failed, using bundled version"
fi
yt-dlp --version
exec "$@"
