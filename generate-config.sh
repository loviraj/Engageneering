#!/bin/bash
# Engageneering™ — generates config.js from Netlify environment variables
# This file IS committed to git. config.js is NOT.
# Run automatically by Netlify before each deploy.

set -e  # exit immediately if any command fails

echo "Generating config.js from environment variables..."

cat > config.js << EOF
// Auto-generated at build time by generate-config.sh
// Do NOT edit manually — set values in Netlify Dashboard → Environment Variables
window.ENG_CONFIG = {
  SUPA_URL:      '${SUPA_URL}',
  SUPA_ANON:     '${SUPA_ANON}',
  RAZORPAY_KEY:  '${RAZORPAY_KEY}',
};
EOF

# Verify the file was created and is non-empty
if [ ! -s config.js ]; then
  echo "ERROR: config.js is empty — check that environment variables are set in Netlify."
  exit 1
fi

echo "config.js generated successfully."
