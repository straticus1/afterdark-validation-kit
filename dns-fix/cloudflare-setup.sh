#!/bin/bash
# Add A records to Cloudflare for all AEIMS sites
# Run this after adding domains to Cloudflare

set -e

# Target IP - the OCI server running AEIMS
TARGET_IP="129.153.158.177"

# Cloudflare API token (replace if needed)
CF_API_TOKEN="${CLOUDFLARE_API_TOKEN:-UQPetPEVxXerVylHN2h68bIZekh-FXHF_Kzs9sNT}"

# Function to get zone ID for a domain
get_zone_id() {
    local domain=$1
    curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$domain" \
        -H "Authorization: Bearer $CF_API_TOKEN" \
        -H "Content-Type: application/json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
zones = data.get('result', [])
if zones:
    print(zones[0]['id'])
else:
    print('')
"
}

# Function to add/update A record
add_a_record() {
    local zone_id=$1
    local name=$2
    local ip=$3
    local proxied=${4:-true}

    echo "  Adding A record: $name -> $ip (proxied: $proxied)"

    # First try to get existing record
    existing=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records?type=A&name=$name" \
        -H "Authorization: Bearer $CF_API_TOKEN" \
        -H "Content-Type: application/json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
records = data.get('result', [])
if records:
    print(records[0]['id'])
else:
    print('')
")

    if [ -n "$existing" ]; then
        # Update existing record
        curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records/$existing" \
            -H "Authorization: Bearer $CF_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data "{\"type\":\"A\",\"name\":\"$name\",\"content\":\"$ip\",\"ttl\":1,\"proxied\":$proxied}" > /dev/null
    else
        # Create new record
        curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
            -H "Authorization: Bearer $CF_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data "{\"type\":\"A\",\"name\":\"$name\",\"content\":\"$ip\",\"ttl\":1,\"proxied\":$proxied}" > /dev/null
    fi
}

# AEIMS domains to configure
DOMAINS=(
    "aeims.app"
    "afterdarksys.com"
    "sexacomms.com"
    "flirts.nyc"
    "nycflirts.com"
    "9inchesof.com"
    "beastybitches.com"
    "cavernof.love"
    "cucking.life"
    "dommecats.com"
    "fantasyflirts.live"
    "gfecalls.com"
    "holyflirts.com"
    "latenite.ai"
    "latenite.love"
    "phonesex.money"
    "shrinkshack.com"
    "psosoundoff.com"
)

# Subdomains to add for each domain
SUBDOMAINS=("@" "www" "login" "api" "admin")

echo "=== Cloudflare DNS Setup for AEIMS ==="
echo "Target IP: $TARGET_IP"
echo ""

for domain in "${DOMAINS[@]}"; do
    echo "Processing $domain..."

    zone_id=$(get_zone_id "$domain")

    if [ -z "$zone_id" ]; then
        echo "  ERROR: Domain not found in Cloudflare. Add it first."
        echo "  Go to: https://dash.cloudflare.com/ and add the domain"
        continue
    fi

    echo "  Zone ID: $zone_id"

    for subdomain in "${SUBDOMAINS[@]}"; do
        if [ "$subdomain" == "@" ]; then
            name="$domain"
        else
            name="$subdomain.$domain"
        fi
        add_a_record "$zone_id" "$name" "$TARGET_IP" "true"
    done

    echo "  Done!"
    echo ""
done

echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Update domain registrar nameservers to Cloudflare"
echo "2. Delete old Route53 hosted zones"
echo "3. Run validation tests: ./validate.sh cdn"
