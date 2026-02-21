const fs = require('fs');
const path = require('path');
const os = require('os');
const CONFIG_PATH = path.join(os.homedir(), '.q', 'config.json');
let CONFIG = {};
// Conversation history handling
const HISTORY_PATH = path.join(os.homedir(), '.q', 'history.json');
function loadHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')); }
  catch { return []; }
}
function saveTurn(userPrompt, assistantReply) {
  const hist = loadHistory();
  hist.push({ role: 'user', content: userPrompt });
  hist.push({ role: 'assistant', content: assistantReply });
  const dir = path.dirname(HISTORY_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(hist, null, 2));
}
let configExists = false;
try {
  CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  configExists = true;
} catch (e) {
  // ignore if file doesn't exist or is invalid
}
if (!configExists) {
  // Ensure config directory exists and write default settings
  const cfgDir = path.dirname(CONFIG_PATH);
  fs.mkdirSync(cfgDir, { recursive: true });
  const defaultConfig = { debug: false };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
  CONFIG = defaultConfig;
}

const ENDPOINT = process.env.OPENAI_BASE_URL
const KEY = process.env.OPENAI_API_KEY;
let SYSTEM_PROMPT = CONFIG.system_prompt;
if (!SYSTEM_PROMPT) {
  // Load default system prompt from file and save to config
  const defaultPrompt = fs.readFileSync(path.join(__dirname, 'system_prompt.md'), 'utf8');
  SYSTEM_PROMPT = defaultPrompt;
  // Update config with system_prompt
  const newConfig = { ...CONFIG, system_prompt: defaultPrompt };
  const cfgDir = path.dirname(CONFIG_PATH);
  fs.mkdirSync(cfgDir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
  CONFIG = newConfig;
}


// Default model and allow overriding via config
const DEFAULT_MODEL = 'gpt-oss-120b';
// model will be determined from config (or default) later


async function askAI(prompt, debug = false) {
  // Resolve model to use (from config or default)
  const usedModel = CONFIG.model || DEFAULT_MODEL;

  // Verify required environment variables
  if (!ENDPOINT) {
    console.error('Error: OPENAI_BASE_URL environment variable is not set.');
    console.error('Add the following line to your shell configuration (e.g., ~/.bashrc or ~/.zshrc):');
    console.error('export OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions');
    process.exit(1);
  }
  if (!KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is not set.');
    console.error('Add the following line to your shell configuration (e.g., ~/.bashrc or ~/.zshrc):');
    console.error('export OPENAI_API_KEY=sk-...');
    process.exit(1);
  }
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KEY}`
    },
    body: JSON.stringify({
    model: usedModel,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]
  })
});

if(CONFIG.debug) console.log(ENDPOINT);

  const data = await response.json();

  // Handle potential error responses that include a "detail" field
  if (data.detail) {
    console.error('Error:', data.detail);
    return;
  }
  if (data.error) {
    console.error('Error:', data.error);
    return;
  }
  // Prepare output (debug mode shows raw data)
  const output = debug ? JSON.stringify(data, null, 2) : data.choices[0].message.content;
  const outputStr = typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output);

  // Pagination: show PAGE_SIZE characters per page (adjust as needed)
  const PAGE_SIZE = 1000;
  if (outputStr.length <= PAGE_SIZE) {
    console.log(outputStr);
    const assistantReply = output;
    // Save turn when not in debug mode
    if (!debug) {
      saveTurn(prompt, assistantReply);
    }
    return;
  }
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let start = 0;
  function showNext() {
    const end = Math.min(start + PAGE_SIZE, outputStr.length);
    console.log(outputStr.slice(start, end));
    start = end;
    if (start < outputStr.length) {
      rl.question('--- Press Enter to continue (or q to quit) ---', (ans) => {
        if (ans.toLowerCase() === 'q') {
          rl.close();
        } else {
          showNext();
        }
      });
    } else {
      rl.close();
    }
  }
  // When pagination finishes, save the turn
  rl.on('close', () => {
    const assistantReply = output;
    if (!debug) {
      saveTurn(prompt, assistantReply);
    }
  });
  showNext();
}

// CLI usage: read prompt from command line (no need for quotes)
if (require.main === module) {
  (async () => {
    // Handle special commands before normal flow
    const rawArgs = process.argv.slice(2);
    if (rawArgs[0] && rawArgs[0].toLowerCase() === 'clear') {
      // Delete conversation history
      try {
        fs.unlinkSync(HISTORY_PATH);
        console.log('Conversation history cleared.');
      } catch (e) {
        // ignore if file doesn't exist
        console.log('No history to clear.');
      }
      process.exit(0);
    }
    let debug = CONFIG.debug || false;
    // Ensure a model is set in config (first run)
  if (!CONFIG.model) {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    const model = await new Promise(resolve => rl.question('Enter default model name (e.g., gpt-3.5-turbo): ', answer => { rl.close(); resolve(answer.trim()); }));
    const cfgDir = path.dirname(CONFIG_PATH);
    fs.mkdirSync(cfgDir, { recursive: true });
    const newConfig = { ...CONFIG, model };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    CONFIG = newConfig;
  }
      const args = process.argv.slice(2);
    // Command to clear conversation history
    if (args[0] && args[0].toLowerCase() === 'clear') {
      try {
        fs.unlinkSync(HISTORY_PATH);
        console.log('Conversation history cleared.');
      } catch (e) {
        // If file doesn't exist, ignore
      }
      process.exit(0);
    }
    if (args[0] && args[0].toLowerCase() === 'debug') {
      // toggle debug mode
      debug = !debug;
      console.log('debug is now ' + (debug ? 'on' : 'off'));
      // Update config file
      const cfgDir = path.dirname(CONFIG_PATH);
      fs.mkdirSync(cfgDir, { recursive: true });
      fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...CONFIG, debug }, null, 2));
      args.shift();
    }
    if (args.length === 0) {
      console.error('Usage: q [debug] <prompt>');
      process.exit(1);
    }
    const cliPrompt = args.join(' ');
    await askAI(cliPrompt, debug);
  })();
  

}

