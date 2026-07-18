/**
 * AI Model Scheduler
 *
 * Central dispatcher that routes tasks to the appropriate AI model.
 * Supports multiple strategies:
 * - 'fixed': Predefined task->model mapping
 * - 'ai_dispatch': Uses an AI model to decide which model handles a task
 * - 'cost_optimized': Picks the cheapest capable model
 * - 'round_robin': Rotates through available models
 */

import {
  TaskRequest,
  TaskResult,
  TaskType,
  SchedulerConfig,
  AIModel,
  ChatMessage,
} from './types';
import { IAIProvider } from './providers/base';

/** Registry of all registered AI providers */
const providerRegistry = new Map<string, IAIProvider>();

/** Default scheduler configuration */
const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  strategy: 'fixed',
  taskModelMapping: {
    generate_story: 'deepseek-chat',
    generate_choices: 'deepseek-chat',
    select_image: 'deepseek-chat',
    initialize_world: 'deepseek-chat',
  },
  defaultModel: 'deepseek-chat',
  maxRetries: 2,
  timeoutMs: 60000,
};

export class AIScheduler {
  private config: SchedulerConfig;
  private providers: Map<string, IAIProvider>;
  /** Map of modelId -> provider */
  private modelProviderMap = new Map<string, IAIProvider>();

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
    this.providers = new Map();
  }

  /**
   * Register an AI provider
   */
  registerProvider(provider: IAIProvider): void {
    this.providers.set(provider.id, provider);
    // Build model -> provider mapping
    for (const model of provider.models) {
      this.modelProviderMap.set(`${provider.id}:${model.id}`, provider);
      // Also register with just model ID for convenience
      if (!this.modelProviderMap.has(model.id)) {
        this.modelProviderMap.set(model.id, provider);
      }
    }
    providerRegistry.set(provider.id, provider);
  }

  /**
   * Get a registered provider by ID
   */
  getProvider(providerId: string): IAIProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Find the provider for a given model ID
   */
  findProviderForModel(modelId: string): IAIProvider | undefined {
    return this.modelProviderMap.get(modelId);
  }

  /**
   * Get all available models across all providers
   */
  getAllModels(): AIModel[] {
    const models: AIModel[] = [];
    for (const provider of this.providers.values()) {
      models.push(...provider.models);
    }
    return models;
  }

  /**
   * Select which model to use for a task
   */
  selectModel(taskType: TaskType): { provider: IAIProvider; modelId: string } | null {
    switch (this.config.strategy) {
      case 'fixed':
        return this.fixedSelection(taskType);
      case 'round_robin':
        return this.roundRobinSelection(taskType);
      case 'cost_optimized':
        return this.costOptimizedSelection(taskType);
      case 'ai_dispatch':
        // AI dispatch is async, handled separately
        return this.fixedSelection(taskType);
      default:
        return this.fixedSelection(taskType);
    }
  }

  /**
   * AI-powered model selection
   * Uses a scheduling-capable model to decide which model should handle the task
   */
  async aiSelectModel(
    taskType: TaskType,
    taskRequest: TaskRequest,
  ): Promise<{ provider: IAIProvider; modelId: string } | null> {
    const schedulerModelId = this.config.schedulerModel || this.config.defaultModel;
    const schedulerProvider = this.findProviderForModel(schedulerModelId);

    if (!schedulerProvider) {
      // Fallback to fixed selection
      return this.fixedSelection(taskType);
    }

    // Build a description of all available models for the scheduler
    const allModels = this.getAllModels();
    const modelsDescription = allModels
      .map(
        (m) =>
          `- ${m.provider}:${m.id} (${m.name}): capabilities=[${m.capabilities.join(', ')}], maxTokens=${m.maxTokens}`,
      )
      .join('\n');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a model scheduling dispatcher. Your job is to select the best model for a given task.
Available models:
${modelsDescription}

Respond with ONLY the model ID in the format "provider:modelId" (e.g., "deepseek:deepseek-chat").
Choose based on:
1. The model's capabilities must include the required task type
2. Prefer more capable models for complex story generation
3. Prefer smaller/cheaper models for simple tasks like image selection`,
      },
      {
        role: 'user',
        content: `Select the best model for task type: "${taskType}". Task context: ${JSON.stringify(taskRequest.messages.slice(-1)[0]?.content || '').slice(0, 200)}`,
      },
    ];

    try {
      const response = await schedulerProvider.chatCompletion({
        model: schedulerModelId,
        messages,
        temperature: 0.3,
        maxTokens: 50,
      });

      const selectedModelId = response.content.trim();

      // Try provider:model format first
      const colonIndex = selectedModelId.indexOf(':');
      if (colonIndex > 0) {
        const providerId = selectedModelId.slice(0, colonIndex);
        const modelId = selectedModelId.slice(colonIndex + 1);
        const provider = this.providers.get(providerId);
        if (provider?.getModel(modelId)) {
          return { provider, modelId };
        }
      }

      // Try direct model ID
      const provider = this.findProviderForModel(selectedModelId);
      if (provider) {
        return { provider, modelId: selectedModelId };
      }

      // Fallback to fixed selection
      return this.fixedSelection(taskType);
    } catch {
      return this.fixedSelection(taskType);
    }
  }

  /**
   * Execute a task through the appropriate model
   */
  async executeTask(taskRequest: TaskRequest, signal?: AbortSignal): Promise<TaskResult> {
    let lastError: Error | null = null;
    const maxRetries = this.config.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check if task forces a specific model
        let modelId: string | undefined;
        let provider: IAIProvider | undefined;

        if (taskRequest.options?.forceModel) {
          modelId = taskRequest.options.forceModel;
          if (modelId) {
            provider = this.findProviderForModel(modelId);
          }
        }

        // Use AI dispatch if strategy is 'ai_dispatch'
        if (!provider && this.config.strategy === 'ai_dispatch') {
          const selected = await this.aiSelectModel(taskRequest.taskType, taskRequest);
          if (selected) {
            provider = selected.provider;
            modelId = selected.modelId;
          }
        }

        // Use fixed/other selection strategies
        if (!provider) {
          const selected = this.selectModel(taskRequest.taskType);
          if (selected) {
            provider = selected.provider;
            modelId = selected.modelId;
          }
        }

        if (!provider || !modelId) {
          throw new Error(`No model available for task type: ${taskRequest.taskType}`);
        }

        const model = provider.getModel(modelId);
        if (!model) {
          throw new Error(`Model ${modelId} not found in provider ${provider.id}`);
        }

        // Create abort controller for timeout
        const timeoutMs = this.config.timeoutMs;
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

        // If external signal provided, forward it
        if (signal) {
          signal.addEventListener('abort', () => abortController.abort());
        }

        try {
          const response = await provider.chatCompletion({
            model: modelId,
            messages: taskRequest.messages,
            temperature: taskRequest.options?.temperature ?? model.defaultTemperature,
            maxTokens: taskRequest.options?.maxTokens ?? model.maxTokens,
            signal: abortController.signal,
          });

          clearTimeout(timeoutId);

          return {
            taskId: taskRequest.id,
            success: true,
            content: response.content,
            modelUsed: modelId,
            providerUsed: provider.id,
            tokensUsed: response.usage,
          };
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error: any) {
        lastError = error;
        if (error?.name === 'AbortError') {
          return {
            taskId: taskRequest.id,
            success: false,
            content: '',
            modelUsed: '',
            providerUsed: '',
            error: 'Request timed out or was cancelled',
          };
        }
        // Continue to retry
      }
    }

    return {
      taskId: taskRequest.id,
      success: false,
      content: '',
      modelUsed: '',
      providerUsed: '',
      error: lastError?.message || 'Unknown error',
    };
  }

  /**
   * Fixed model selection based on config mapping
   */
  private fixedSelection(taskType: TaskType): { provider: IAIProvider; modelId: string } | null {
    const modelId = this.config.taskModelMapping[taskType] || this.config.defaultModel;
    const provider = this.findProviderForModel(modelId);
    if (provider) {
      return { provider, modelId };
    }
    return null;
  }

  /**
   * Round-robin model selection
   */
  private roundRobinSelection(taskType: TaskType): { provider: IAIProvider; modelId: string } | null {
    const capableModels = this.getAllModels().filter((m) =>
      m.capabilities.includes(taskType as any),
    );
    if (capableModels.length === 0) return this.fixedSelection(taskType);

    // Simple round-robin based on timestamp
    const index = Date.now() % capableModels.length;
    const model = capableModels[index];
    const provider = this.findProviderForModel(model.id);
    if (provider) {
      return { provider, modelId: model.id };
    }
    return null;
  }

  /**
   * Cost-optimized model selection (prefer cheaper models)
   */
  private costOptimizedSelection(taskType: TaskType): { provider: IAIProvider; modelId: string } | null {
    const capableModels = this.getAllModels().filter((m) =>
      m.capabilities.includes(taskType as any),
    );
    if (capableModels.length === 0) return this.fixedSelection(taskType);

    // Sort by cost (cheapest first)
    capableModels.sort(
      (a, b) => (a.inputCostPer1K || 0) - (b.inputCostPer1K || 0),
    );
    const model = capableModels[0];
    const provider = this.findProviderForModel(model.id);
    if (provider) {
      return { provider, modelId: model.id };
    }
    return null;
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(config: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current scheduler configuration
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }
}

/** Global scheduler instance */
let globalScheduler: AIScheduler | null = null;

export function getScheduler(): AIScheduler {
  if (!globalScheduler) {
    globalScheduler = new AIScheduler();
  }
  return globalScheduler;
}

export function resetScheduler(): void {
  globalScheduler = null;
}
