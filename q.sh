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
MODEL="${OPENAI_COMPATIBLE_MODEL:-llama3.1-8b}"
BASE_URL="${OPENAI_COMPATIBLE_BASE_URL}"
API_KEY="${OPENAI_COMPATIBLE_API_KEY}"

if [ -z "$BASE_URL" ] || [ -z "$API_KEY" ]; then
    echo "$(date) [USER: $(whoami)] Error: Env variables missing." >> "$LOGFILE"
    echo "Error: OPENAI_COMPATIBLE_BASE_URL and OPENAI_COMPATIBLE_API_KEY must be set."
    exit 1
fi

PROMPT="$1"

# Optional debug: set Q_DEBUG=1 to echo raw response when result is null/empty
DEBUG="${Q_DEBUG:-0}"

# Normalize endpoint: allow base URL or full chat completions URL
if [[ "$BASE_URL" == *"/chat/completions"* ]]; then
  ENDPOINT="$BASE_URL"
else
  ENDPOINT="${BASE_URL%/}/chat/completions"
fi

# Prepare JSON and send request
# Capture response and curl exit status separately
RESPONSE=$(curl -sS "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"model\": \"$MODEL\",
    \"messages\": [{\"role\": \"user\", \"content\": \"$PROMPT\"}]
  }")
curl_status=$?

# Check for curl errors
if [ $curl_status -ne 0 ]; then
    echo "$(date) [USER: $(whoami)] Curl error: $curl_status" >> "$LOGFILE"
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

if [ "$DEBUG" = "1" ] && { [ -z "$RESULT" ] || [ "$RESULT" = "null" ]; }; then
    echo "Debug: raw response follows:" >&2
    echo "$RESPONSE" >&2
fi

echo "$RESULT"
