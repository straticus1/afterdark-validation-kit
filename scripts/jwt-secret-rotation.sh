#!/bin/bash
# JWT Secret Rotation Script for AfterDark Systems
# This script generates new JWT secrets and updates Kubernetes secrets

set -e

# Configuration
KUBECONFIG="${KUBECONFIG:-$HOME/development/warp-oci/kubeconfig}"
export KUBECONFIG

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== AfterDark JWT Secret Rotation Script ===${NC}"
echo ""

# Generate cryptographically secure JWT secret (64 bytes = 512 bits)
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d '\n'
}

# Function to update K8s secret
update_k8s_secret() {
    local namespace=$1
    local secret_name=$2
    local key=$3
    local value=$4

    echo -e "${YELLOW}Updating secret ${secret_name} in namespace ${namespace}...${NC}"

    # Check if secret exists
    if kubectl get secret "$secret_name" -n "$namespace" &>/dev/null; then
        # Update existing secret
        kubectl patch secret "$secret_name" -n "$namespace" \
            -p "{\"data\":{\"${key}\":\"$(echo -n "$value" | base64)\"}}"
        echo -e "${GREEN}  Updated existing secret${NC}"
    else
        # Create new secret
        kubectl create secret generic "$secret_name" -n "$namespace" \
            --from-literal="$key=$value"
        echo -e "${GREEN}  Created new secret${NC}"
    fi
}

# Generate new secrets
echo "Generating new JWT secrets..."
JWT_SECRET_INFRASTRUCTURE=$(generate_jwt_secret)
JWT_SECRET_SECRETSERVER=$(generate_jwt_secret)
JWT_SECRET_COMPUTEAPI=$(generate_jwt_secret)
JWT_SECRET_ADMIN=$(generate_jwt_secret)

echo -e "${GREEN}Generated 4 new JWT secrets${NC}"
echo ""

# Show what will be updated
echo "The following secrets will be rotated:"
echo "  1. infrastructure-prod/infrastructure-secrets (jwt_secret_key)"
echo "  2. secretserver-prod/secretserver-jwt (secret)"
echo "  3. computeapi-prod/computeapi-secrets (COMPUTEAPI_JWT_SECRET)"
echo "  4. admin-panel/admin-secrets (JWT_SECRET)"
echo ""

# Confirmation
read -p "Continue with rotation? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Rotating JWT secrets..."

# Update infrastructure.zone secret
if kubectl get ns infrastructure-prod &>/dev/null; then
    update_k8s_secret "infrastructure-prod" "infrastructure-secrets" "jwt_secret_key" "$JWT_SECRET_INFRASTRUCTURE"
else
    echo -e "${YELLOW}  Namespace infrastructure-prod not found, skipping${NC}"
fi

# Update secretserver.io secret
if kubectl get ns secretserver-prod &>/dev/null; then
    update_k8s_secret "secretserver-prod" "secretserver-jwt" "secret" "$JWT_SECRET_SECRETSERVER"
else
    echo -e "${YELLOW}  Namespace secretserver-prod not found, skipping${NC}"
fi

# Update computeapi.io secret
if kubectl get ns computeapi-prod &>/dev/null; then
    kubectl patch secret computeapi-secrets -n computeapi-prod \
        -p "{\"data\":{\"COMPUTEAPI_JWT_SECRET\":\"$(echo -n "$JWT_SECRET_COMPUTEAPI" | base64)\"}}" 2>/dev/null && \
        echo -e "${GREEN}  Updated computeapi-prod/computeapi-secrets${NC}" || \
        echo -e "${YELLOW}  computeapi-prod secret not found, skipping${NC}"
fi

# Update admin-panel secret
if kubectl get ns admin-panel &>/dev/null; then
    if kubectl get secret admin-secrets -n admin-panel &>/dev/null; then
        update_k8s_secret "admin-panel" "admin-secrets" "JWT_SECRET" "$JWT_SECRET_ADMIN"
    else
        echo -e "${YELLOW}  admin-panel/admin-secrets not found, skipping${NC}"
    fi
fi

echo ""
echo -e "${GREEN}=== JWT Secret Rotation Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Restart deployments to pick up new secrets:"
echo "     kubectl rollout restart deployment -n infrastructure-prod"
echo "     kubectl rollout restart deployment -n secretserver-prod"
echo "     kubectl rollout restart deployment -n computeapi-prod"
echo "     kubectl rollout restart deployment -n admin-panel"
echo ""
echo "  2. Update local .env files for development:"
echo "     - infrastructure.zone/backend/.env"
echo "     - afterdarksys.com/subdomains/*/.env"
echo ""
echo "  3. Invalidate existing JWT tokens (users will need to re-login)"
echo ""
echo -e "${YELLOW}WARNING: All existing JWT tokens will become invalid after restart!${NC}"

# Save rotation log
ROTATION_LOG="/Users/ryan/development/afterdark-validation-kit/logs/jwt-rotation-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$ROTATION_LOG")"
cat > "$ROTATION_LOG" << EOF
JWT Secret Rotation Log
========================
Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Rotated By: $(whoami)

Secrets Rotated:
- infrastructure-prod/infrastructure-secrets
- secretserver-prod/secretserver-jwt
- computeapi-prod/computeapi-secrets
- admin-panel/admin-secrets

Note: JWT secrets are NOT logged for security reasons.
EOF

echo ""
echo -e "${GREEN}Rotation log saved to: ${ROTATION_LOG}${NC}"
