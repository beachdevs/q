#!/bin/bash

# q - OpenAI-compatible API wrapper for chat completions

# Self contained .sh - nothing else required

# Ensure env is available to all users
[ -f /etc/profile ] && . /etc/profile
[ -f /etc/zshenv ] && . /etc/zshenv

# For debug: log calls from each user
LOGFILE="/tmp/q.log"
chmod 666 "$LOGFILE" 2>/dev/null || true

# Defaults
MODEL="${OPENAI_MODEL:-llama3.1-8b}"
BASE_URL="${OPENAI_COMPATIBLE_BASE_URL}"
API_KEY="${OPENAI_COMPATIBLE_API_KEY}"

if [ -z "$BASE_URL" ] || [ -z "$API_KEY" ]; then
    echo "$(date) [USER: $(whoami)] Error: Env variables missing." >> "$LOGFILE"
    echo "Error: OPENAI_COMPATIBLE_BASE_URL and OPENAI_COMPATIBLE_API_KEY must be set."
    exit 1
fi

PROMPT="$1"

# Prepare JSON and send request
RESPONSE=$(curl -s "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"model\": \"$MODEL\",
    \"messages\": [{\"role\": \"user\", \"content\": \"$PROMPT\"}]
  }")

# Check for curl errors
if [ $? -ne 0 ]; then
    echo "$(date) [USER: $(whoami)] Curl error: $?" >> "$LOGFILE"
    exit 1
fi

# Log the raw response for debugging (truncated)
# echo "$(date) [USER: $(whoami)] Response: ${RESPONSE:0:200}" >> "$LOGFILE"

# Extract content using jq if available, otherwise fallback to sed
if command -v jq >/dev/null 2>&1; then
    RESULT=$(echo "$RESPONSE" | jq -r '.choices[0].message.content')
else
    RESULT=$(echo "$RESPONSE" | sed -n 's/.*"content": *"\([^"]*\)".*/\1/p' | sed 's/\\n/\n/g' | sed 's/\\"/"/g')
fi

echo "$RESULT"
