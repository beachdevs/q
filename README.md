# q CLI

A simple CLI for interacting with OpenAI-compatible chat completion endpoints.

## Installation

### Standalone Binaries

Download the binary for your platform from the [releases](https://github.com/beachdevs/q/releases) page and move it to your path:

```bash
mv q-macos-arm64 /usr/local/bin/q
chmod +x /usr/local/bin/q
```

### From Source (Requires Node.js)

```bash
npm install -g .
```
## Configuration

The CLI requires two environment variables:

- `OPENAI_COMPATIBLE_BASE_URL`: The full URL to the chat completions endpoint (e.g., `https://api.openai.com/v1/chat/completions`).
- `OPENAI_COMPATIBLE_API_KEY`: Your API key.

Add these to your shell configuration (e.g., `~/.bashrc` or `~/.zshrc`):

```bash
export OPENAI_COMPATIBLE_BASE_URL=https://api.openai.com/v1/chat/completions
export OPENAI_COMPATIBLE_API_KEY=your_api_key_here
```

### Local Config

On the first run, `q` will create a configuration directory at `~/.q/` and a `config.json` file.
You will be prompted for a default model name.

You can manually edit `~/.q/config.json` to change the `system_prompt` or `model`.

## Usage

```bash
q "How's the weather today?"
```

### Debug Mode

Toggle debug mode to see raw API responses:

```bash
q debug "How's the weather today?"
```

### Clear History

Clear the conversation history:

```bash
q clear
```

## Storage

- Config: `~/.q/config.json`
- History: `~/.q/history.json`