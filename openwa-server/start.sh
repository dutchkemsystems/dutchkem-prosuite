#!/bin/bash
# Start OpenWA server for admin session
export CONVEX_URL=https://warmhearted-aardvark-280.convex.cloud
export SESSION_TYPE=admin
export POLL_INTERVAL_MS=3000

echo "Starting OpenWA server (admin)..."
node server.js
