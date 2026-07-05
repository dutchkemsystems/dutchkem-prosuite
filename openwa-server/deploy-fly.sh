#!/bin/bash
# deploy-fly.sh — Deploy OpenWA server to Fly.io
# Usage: ./deploy-fly.sh [admin|enterprise|both]

set -e

SESSION_TYPE=${1:-both}

echo "=== Dutchkem OpenWA Fly.io Deployment ==="
echo ""

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null && ! command -v fly &> /dev/null; then
    echo "Error: flyctl not found. Install it from https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Use flyctl or fly
FLY=$(command -v flyctl || command -v fly)

deploy_admin() {
    echo ">>> Deploying ADMIN session to Fly.io..."
    $FLY deploy --config fly.toml --app dutchkem-openwa-admin
    
    # Create volume if it doesn't exist
    $FLY volumes list --app dutchkem-openwa-admin | grep -q openwa_auth_admin || \
        $FLY volumes create openwa_auth_admin --app dutchkem-openwa-admin --region ams
    
    echo ">>> Admin deployment complete!"
    echo ">>> Admin app: https://dutchkem-openwa-admin.fly.dev"
}

deploy_enterprise() {
    echo ">>> Deploying ENTERPRISE session to Fly.io..."
    $FLY deploy --config fly-enterprise.toml --app dutchkem-openwa-enterprise
    
    # Create volume if it doesn't exist
    $FLY volumes list --app dutchkem-openwa-enterprise | grep -q openwa_auth_enterprise || \
        $FLY volumes create openwa_auth_enterprise --app dutchkem-openwa-enterprise --region ams
    
    echo ">>> Enterprise deployment complete!"
    echo ">>> Enterprise app: https://dutchkem-openwa-enterprise.fly.dev"
}

case $SESSION_TYPE in
    admin)
        deploy_admin
        ;;
    enterprise)
        deploy_enterprise
        ;;
    both)
        deploy_admin
        echo ""
        deploy_enterprise
        ;;
    *)
        echo "Usage: $0 [admin|enterprise|both]"
        exit 1
        ;;
esac

echo ""
echo "=== Deployment Summary ==="
echo "Admin:     https://dutchkem-openwa-admin.fly.dev"
echo "Enterprise: https://dutchkem-openwa-enterprise.fly.dev"
echo ""
echo "Next steps:"
echo "1. View QR codes: $FLY logs --app dutchkem-openwa-admin"
echo "2. Scan QR with WhatsApp to authenticate"
echo "3. Messages will be sent via the OpenWA server"
