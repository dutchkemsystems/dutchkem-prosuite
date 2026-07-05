#!/bin/bash
# Start OpenWA server for enterprise session
export CONVEX_URL=https://warmhearted-aardvark-280.convex.cloud
export SESSION_TYPE=enterprise
export POLL_INTERVAL_MS=3000

echo "Starting OpenWA server (enterprise)..."
node server.js
