#!/bin/bash
# Delete all Route53 hosted zones
# RUN THIS ONLY AFTER DOMAINS ARE MIGRATED TO CLOUDFLARE

set -e

echo "=== Route53 Zone Cleanup Script ==="
echo "WARNING: This will delete all Route53 hosted zones!"
echo "Make sure all domains are already pointed to Cloudflare before running!"
echo ""
read -p "Type 'DELETE' to confirm: " confirm

if [ "$confirm" != "DELETE" ]; then
    echo "Aborted."
    exit 1
fi

# Get all hosted zones
zones=$(aws route53 list-hosted-zones --query 'HostedZones[*].Id' --output text)

for zone_id in $zones; do
    zone_name=$(aws route53 get-hosted-zone --id "$zone_id" --query 'HostedZone.Name' --output text)
    echo "Processing zone: $zone_name ($zone_id)"

    # First, delete all records except NS and SOA (which are auto-created)
    records=$(aws route53 list-resource-record-sets --hosted-zone-id "$zone_id" \
        --query "ResourceRecordSets[?Type != 'NS' && Type != 'SOA']" --output json)

    if [ "$records" != "[]" ]; then
        echo "  Deleting records..."

        # Create change batch for deletion
        change_batch=$(echo "$records" | python3 -c "
import sys, json
records = json.load(sys.stdin)
changes = []
for r in records:
    changes.append({'Action': 'DELETE', 'ResourceRecordSet': r})
print(json.dumps({'Changes': changes}))
")

        aws route53 change-resource-record-sets \
            --hosted-zone-id "$zone_id" \
            --change-batch "$change_batch" 2>/dev/null || true
    fi

    # Now delete the zone
    echo "  Deleting zone..."
    aws route53 delete-hosted-zone --id "$zone_id" 2>/dev/null || echo "  Failed to delete (may have records)"
done

echo ""
echo "=== Route53 cleanup complete ==="
echo "Verify at: https://console.aws.amazon.com/route53/v2/hostedzones"
