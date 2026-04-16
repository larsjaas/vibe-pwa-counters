#!/bin/bash
# Copy swagger-ui assets from node_modules to public folder and configure initializer
echo "Copying swagger-ui assets..."

# Ensure destination exists
mkdir -p src/public/swagger-ui

# Copy all files from swagger-ui-dist to src/public/swagger-ui
cp -r node_modules/swagger-ui-dist/. src/public/swagger-ui/

# Replace the default swagger URL with the local openapi.yaml
# Note: the original file has a comma at the end of the line.
# The regex looks for 'url: "..."' and replaces it with 'url: "/openapi.yaml"'
# preserving the trailing comma if it existed or adding it if we are replacing the whole pair.
sed -i 's|url: "[^"]*"|url: "/openapi.yaml"|' src/public/swagger-ui/swagger-initializer.js

echo "Swagger-ui assets updated and configured for /openapi.yaml."
