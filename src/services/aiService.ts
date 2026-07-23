import { AIProvider, AppConfig } from '../types';

export interface ProcessTextParams {
  provider: AIProvider;
  model: string;
  promptTemplate: string;
  inputText: string;
  systemPrompt?: string;
  temperature?: number;
  config: AppConfig;
  signal?: AbortSignal;
}

export interface ProcessTextResult {
  output: string;
  executionTimeMs: number;
  provider: AIProvider;
  model: string;
  tokenEstimate?: number;
}

export async function processAIText(params: ProcessTextParams): Promise<ProcessTextResult> {
  const { provider, model, promptTemplate, inputText, systemPrompt, temperature = 0.7, config, signal } = params;
  const startTime = Date.now();

  // Validate input text
  if (!inputText && !promptTemplate) {
    throw new Error('No input text provided to process.');
  }

  // Construct full text prompt
  let fullPrompt = '';
  if (promptTemplate) {
    if (promptTemplate.includes('{text}')) {
      fullPrompt = promptTemplate.replace(/{text}/g, inputText);
    } else {
      fullPrompt = `${promptTemplate}\n\nInput Text:\n${inputText}`;
    }
  } else {
    fullPrompt = inputText;
  }

  // 1. Gemini AI Provider (Default Server Proxy or Client Direct)
  if (provider === 'gemini') {
    const userApiKey = config.providers.gemini?.apiKey || '';
    
    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          prompt: promptTemplate,
          inputText,
          systemPrompt,
          model,
          apiKey: userApiKey,
          temperature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Gemini API returned status ${response.status}`);
      }

      const data = await response.json();
      return {
        output: data.output,
        executionTimeMs: Date.now() - startTime,
        provider: 'gemini',
        model: data.model || model,
        tokenEstimate: Math.round((fullPrompt.length + data.output.length) / 4),
      };
    } catch (err: any) {
      if (err.name === 'AbortError') throw new Error('Request cancelled by user');
      throw new Error(err.message || 'Failed to communicate with Gemini API');
    }
  }

  // 2. OpenAI Provider
  if (provider === 'openai') {
    const apiKey = config.providers.openai?.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API Key is missing. Please add your key in Settings > AI Providers.');
    }

    try {
      const messages: any[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: fullPrompt });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal,
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages,
          temperature,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error('Invalid OpenAI API Key.');
        if (response.status === 429) throw new Error('OpenAI Rate limit or Quota exceeded.');
        throw new Error(errData.error?.message || `OpenAI API error (${response.status})`);
      }

      const data = await response.json();
      const output = data.choices?.[0]?.message?.content || 'No response generated.';
      return {
        output,
        executionTimeMs: Date.now() - startTime,
        provider: 'openai',
        model,
        tokenEstimate: data.usage?.total_tokens || Math.round((fullPrompt.length + output.length) / 4),
      };
    } catch (err: any) {
      if (err.name === 'AbortError') throw new Error('Request cancelled by user');
      throw new Error(err.message || 'OpenAI API execution failed.');
    }
  }

  // 3. Anthropic Provider
  if (provider === 'anthropic') {
    const apiKey = config.providers.anthropic?.apiKey;
    if (!apiKey) {
      throw new Error('Anthropic API Key is missing. Please add your key in Settings > AI Providers.');
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true',
        },
        signal,
        body: JSON.stringify({
          model: model || 'claude-3-5-haiku-20241022',
          max_tokens: 4096,
          system: systemPrompt || undefined,
          messages: [{ role: 'user', content: fullPrompt }],
          temperature,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Anthropic API error (${response.status})`);
      }

      const data = await response.json();
      const output = data.content?.[0]?.text || 'No response generated.';
      return {
        output,
        executionTimeMs: Date.now() - startTime,
        provider: 'anthropic',
        model,
        tokenEstimate: Math.round((fullPrompt.length + output.length) / 4),
      };
    } catch (err: any) {
      if (err.name === 'AbortError') throw new Error('Request cancelled by user');
      throw new Error(err.message || 'Anthropic API execution failed.');
    }
  }

  // 4. Ollama (Local GPU/CPU LLM)
  if (provider === 'ollama') {
    const baseUrl = config.providers.ollama?.baseUrl || 'http://localhost:11434/v1';

    try {
      const messages: any[] = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: fullPrompt });

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          model: model || 'llama3.2',
          messages,
          temperature,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}. Is Ollama service running?`);
      }

      const data = await response.json();
      const output = data.choices?.[0]?.message?.content || 'No response generated.';
      return {
        output,
        executionTimeMs: Date.now() - startTime,
        provider: 'ollama',
        model,
        tokenEstimate: Math.round((fullPrompt.length + output.length) / 4),
      };
    } catch (err: any) {
      if (err.name === 'AbortError') throw new Error('Request cancelled by user');
      throw new Error(
        `Ollama Connection Error: Could not connect to local Ollama at ${baseUrl}. Ensure Ollama is running on your Windows machine ('ollama run llama3.2') and CORS is enabled.`
      );
    }
  }

  // 5. OpenRouter / Custom Endpoint
  if (provider === 'openrouter' || provider === 'custom') {
    const providerCfg = config.providers[provider];
    const baseUrl = providerCfg?.baseUrl || (provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'http://localhost:8000/v1');
    const apiKey = providerCfg?.apiKey || '';

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://quickkeys.ai';
        headers['X-Title'] = 'QuickKeys AI Windows App';
      }

      const messages: any[] = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: fullPrompt });

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({
          model: model || 'custom-model',
          messages,
          temperature,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || errData.message || `Custom API error (${response.status})`);
      }

      const data = await response.json();
      const output = data.choices?.[0]?.message?.content || 'No response generated.';
      return {
        output,
        executionTimeMs: Date.now() - startTime,
        provider,
        model,
        tokenEstimate: data.usage?.total_tokens || Math.round((fullPrompt.length + output.length) / 4),
      };
    } catch (err: any) {
      if (err.name === 'AbortError') throw new Error('Request cancelled by user');
      throw new Error(err.message || `Failed to connect to ${provider} API at ${baseUrl}`);
    }
  }

  throw new Error(`Unsupported AI Provider: ${provider}`);
}
