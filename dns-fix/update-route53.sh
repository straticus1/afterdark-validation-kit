#!/bin/bash
# Script to update Route53 DNS records from deleted AWS ALBs to OCI IP

OCI_IP="129.153.158.177"

# Zone ID mappings (domain -> zone_id)
declare -A ZONES=(
    ["sexacomms.com"]="Z06944652A6PL7SOH92OT"
    ["aeims.app"]="Z0819048KQ6II7V1JPW6"
    ["flirts.nyc"]="Z07876702K972OPEHGGZ5"
    ["nycflirts.com"]="Z07446796M16YCNQNR7N"
    ["9inchesof.com"]="Z061864317QI1PFMH1QHV"
    ["beastybitches.com"]="Z0514026G13IONC6E0TJ"
    ["cavernof.love"]="Z02819832SZYY8TOODG5O"
    ["dommecats.com"]="Z08340432M29HHR35AE66"
    ["fantasyflirts.live"]="Z0779739TIQVDGJNZYLP"
    ["gfecalls.com"]="Z0832972HR3RWKKFEKBQ"
    ["holyflirts.com"]="Z028198135IBE7PIYNW51"
    ["latenite.ai"]="Z028237716KUV6W49MX4"
    ["latenite.love"]="Z05080993OOPZ6GNBHOKE"
    ["phonesex.money"]="Z0778629AEIOI3LOTP1G"
    ["shrinkshack.com"]="Z07790682UXO7AXAIUGTE"
    ["afterdarksys.com"]="Z027509618XR28UMLCYKV"
)

update_zone() {
    local domain=$1
    local zone_id=$2

    echo "Updating $domain (Zone: $zone_id)..."

    # Get current A/ALIAS records
    records=$(aws route53 list-resource-record-sets --hosted-zone-id "$zone_id" --query "ResourceRecordSets[?Type=='A']" --output json 2>/dev/null)

    # Create change batch
    changes=""

    for record in $(echo "$records" | jq -r '.[] | @base64'); do
        _jq() {
            echo ${record} | base64 --decode | jq -r ${1}
        }

        name=$(_jq '.Name')
        has_alias=$(_jq '.AliasTarget // empty')

        if [ -n "$has_alias" ]; then
            # This is an ALIAS record pointing to deleted ALB - delete it and create A record
            alias_dns=$(_jq '.AliasTarget.DNSName')
            alias_zone=$(_jq '.AliasTarget.HostedZoneId')

            echo "  Converting $name from ALIAS to A record..."

            # Delete the ALIAS record first
            delete_batch=$(cat <<EOF
{
    "Changes": [
        {
            "Action": "DELETE",
            "ResourceRecordSet": {
                "Name": "$name",
                "Type": "A",
                "AliasTarget": {
                    "HostedZoneId": "$alias_zone",
                    "DNSName": "$alias_dns",
                    "EvaluateTargetHealth": false
                }
            }
        },
        {
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "$name",
                "Type": "A",
                "TTL": 300,
                "ResourceRecords": [
                    {"Value": "$OCI_IP"}
                ]
            }
        }
    ]
}
EOF
)
            aws route53 change-resource-record-sets --hosted-zone-id "$zone_id" --change-batch "$delete_batch" 2>/dev/null
            if [ $? -eq 0 ]; then
                echo "    ✓ Updated $name"
            else
                echo "    ✗ Failed to update $name"
            fi
        fi
    done
}

echo "Starting DNS update to OCI IP: $OCI_IP"
echo "============================================"

for domain in "${!ZONES[@]}"; do
    update_zone "$domain" "${ZONES[$domain]}"
    echo ""
done

echo "============================================"
echo "DNS update complete. Changes may take a few minutes to propagate."
