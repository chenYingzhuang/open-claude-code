/**
 * Domestic (China) LLM provider presets with URLs, pricing, and model data.
 * All providers are OpenAI-compatible — just swap baseURL + apiKey.
 */

import { normalizeProviderBaseURL } from '../network/providerUrl.js'
import { isDeepSeekBaseURL } from './deepseekHost.js'

export type ProviderModelKind =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'realtime'

export type ProviderModel = {
  id: string
  label: string
  inputPricePerMTok: number
  outputPricePerMTok: number
  /**
   * Display window ('1M', '262K'). Empty for non-text models: they are not
   * main-loop checkpoints, and a made-up window would steer auto-compact.
   */
  contextWindow: string
  free?: boolean
  tags?: string[]
  deprecated?: string
  /**
   * Picker price line, when the ¥/Mtok pair is not what should be shown
   * (a night discount, a router, or a non-text model).
   */
  priceLabel?: string
  /** Defaults to text. Non-text models are listed but have no context window. */
  kind?: ProviderModelKind
}

export type CodingPlanTier = {
  id: string
  label: string
  price: string
  credits: string
  description: string
}

/**
 * Which of the provider's models backs each family alias.
 *
 * One API key makes the provider's whole catalog usable, so these are only the
 * defaults behind `/model sonnet` and friends — `/model <id>` still reaches any
 * model in `models` (and any id the provider serves but this table has not
 * caught up with, since unrecognized names pass through untouched).
 *
 * `fable` matters more than it looks: unset, getDefaultFableModel() falls back
 * to an Anthropic model name, which a Chinese endpoint would simply reject.
 * Ids may repeat — most of these providers ship one flagship and one fast model,
 * not four tiers.
 */
export type ProviderTierModels = {
  haiku: string
  sonnet: string
  opus: string
  fable: string
}

export type ProviderSubscription = {
  baseURL: string
  keyFormat: string
  purchasePage: string
  tiers: CodingPlanTier[]
  /** Anthropic-compatible base, when this subscription publishes one. */
  anthropicBaseURL?: string
}

export type ChinaAccessMode = 'api' | 'coding-plan' | 'token-plan'

export type ProviderPreset = {
  id: string
  label: string
  description: string
  icon: string
  baseURL: string
  apiKeyPage: string
  modelsPage: string
  freeTier: string
  keyFormat: string
  defaultModel: string
  tiers: ProviderTierModels
  codingPlan?: ProviderSubscription
  /** Subscription credits. Distinct host and key from Coding Plan. */
  tokenPlan?: ProviderSubscription
  models: ProviderModel[]
}

export const CHINA_LLM_PROVIDERS: ProviderPreset[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'Cheapest pricing, best code, 5M free tokens',
    icon: '\u{1F525}',
    baseURL: 'https://api.deepseek.com',
    apiKeyPage: 'https://platform.deepseek.com/api_keys',
    modelsPage: 'https://api-docs.deepseek.com/zh-cn/',
    freeTier: '5M tokens on signup (30 days), min top-up ¥10',
    keyFormat: 'sk-...',
    defaultModel: 'deepseek-v4-pro',
    tiers: {
      haiku: 'deepseek-v4-flash',
      sonnet: 'deepseek-v4-pro',
      opus: 'deepseek-v4-pro',
      fable: 'deepseek-v4-pro',
    },
    models: [
      {
        id: 'deepseek-v4-pro',
        label: 'DeepSeek V4 Pro',
        inputPricePerMTok: 3,
        outputPricePerMTok: 6,
        contextWindow: '1M',
        tags: ['Recommended', 'Best code'],
      },
      {
        id: 'deepseek-v4-flash',
        label: 'DeepSeek V4 Flash',
        inputPricePerMTok: 1,
        outputPricePerMTok: 2,
        contextWindow: '1M',
        tags: ['Fast'],
      },
    ],
  },
  {
    id: 'zhipu',
    label: 'Zhipu GLM',
    description: 'Free models, Coding Plan, strong reasoning',
    icon: '\u{1F9E0}',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyPage: 'https://open.bigmodel.cn/user/apiKeys',
    modelsPage: 'https://docs.bigmodel.cn/cn/guide/start/model-overview',
    freeTier: 'GLM-4.7-Flash / GLM-Z1-Flash free forever',
    defaultModel: 'glm-4.7',
    tiers: {
      haiku: 'glm-4.7-flash',
      sonnet: 'glm-4.7',
      opus: 'glm-5.1',
      fable: 'glm-5.1',
    },
    keyFormat: '{id}.{secret}',
    codingPlan: {
      baseURL: 'https://open.bigmodel.cn/api/coding/paas/v4',
      keyFormat: '{id}.{secret}',
      purchasePage: 'https://bigmodel.cn/claude-code',
      tiers: [
        {
          id: 'lite',
          label: 'Lite',
          price: '¥72/mo ($30/quarter)',
          credits: '~400 prompts/week',
          description: 'GLM-5.1/5-Turbo/4.7/4.5-Air, MCP tools',
        },
        {
          id: 'pro',
          label: 'Pro',
          price: '¥216/mo ($90/quarter)',
          credits: '~2000 prompts/week',
          description: 'Lite + GLM-5, 5x quota',
        },
        {
          id: 'max',
          label: 'Max',
          price: '¥576/mo ($240/quarter)',
          credits: '~8000 prompts/week',
          description: '4x Pro quota for heavy use',
        },
      ],
    },
    models: [
      {
        id: 'glm-5.1',
        label: 'GLM-5.1',
        inputPricePerMTok: 10.1,
        outputPricePerMTok: 31.7,
        contextWindow: '203K',
        tags: ['Flagship'],
      },
      {
        id: 'glm-4.7',
        label: 'GLM-4.7',
        inputPricePerMTok: 4.3,
        outputPricePerMTok: 15.8,
        contextWindow: '205K',
        tags: ['Recommended'],
      },
      {
        id: 'glm-4.7-flash',
        label: 'GLM-4.7 Flash',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '203K',
        free: true,
        tags: ['Free forever'],
      },
    ],
  },
  {
    id: 'qwen',
    label: 'Tongyi Qianwen',
    description: 'Alibaba Cloud, Token Plan, Coding Plan',
    icon: '☁️',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyPage: 'https://bailian.console.aliyun.com',
    modelsPage:
      'https://help.aliyun.com/zh/model-studio/getting-started/models',
    freeTier: '90-day free tier for all models after activation',
    // Coding default stays on Qwen text. The Token Plan also serves
    // DeepSeek, GLM, and media models; those are listed, not the tiers.
    defaultModel: 'qwen3.8-max',
    tiers: {
      haiku: 'qwen3.8-flash',
      sonnet: 'qwen3.7-plus',
      opus: 'qwen3.8-max',
      fable: 'qwen3.8-max',
    },
    keyFormat: 'sk-...',
    codingPlan: {
      baseURL: 'https://coding.dashscope.aliyuncs.com/v1',
      keyFormat: 'sk-sp-...',
      purchasePage: 'https://bailian.console.aliyun.com',
      tiers: [
        {
          id: 'pro',
          label: 'Pro',
          price: '¥200/mo',
          credits: 'Includes Qwen/GLM/Kimi/MiniMax models',
          description: 'Entry tier (Lite discontinued 2026/03)',
        },
      ],
    },
    tokenPlan: {
      baseURL: 'https://token-plan.maas.qianwenaiapi.com/compatible-mode/v1',
      anthropicBaseURL:
        'https://token-plan.maas.qianwenaiapi.com/apps/anthropic',
      keyFormat: 'sk-sp-...',
      purchasePage: 'https://bailian.console.aliyun.com',
      tiers: [
        {
          id: 'token-plan',
          label: 'Token Plan',
          price: 'Subscription credits',
          credits: 'Qwen night 40% of list; DeepSeek night 50%',
          description:
            'Qwen text is the coding default. decision-model-preview is free for a limited time.',
        },
      ],
    },
    models: [
      {
        id: 'qwen3.8-max',
        label: 'Qwen3.8 Max',
        inputPricePerMTok: 12,
        outputPricePerMTok: 36,
        contextWindow: '1M',
        tags: ['Flagship', 'Vision', 'Night 40%'],
        priceLabel: '¥12/¥36 · night 40% of list',
      },
      {
        id: 'qwen3.8-flash',
        label: 'Qwen3.8 Flash',
        inputPricePerMTok: 0.8,
        outputPricePerMTok: 2.7,
        contextWindow: '1M',
        tags: ['Fast', 'Vision', 'Night 40%'],
        priceLabel: '¥0.8/¥2.7 · night 40% of list',
      },
      {
        id: 'qwen3.7-plus',
        label: 'Qwen3.7 Plus',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '1M',
        tags: ['Vision'],
        priceLabel: 'Text, vision',
      },
      {
        id: 'qwen3.7-max',
        label: 'Qwen3.7 Max',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '1M',
        tags: ['Reasoning'],
        priceLabel: 'Text, reasoning',
      },
      {
        id: 'qwen3.6-flash',
        label: 'Qwen3.6 Flash',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '1M',
        tags: ['Fast', 'Vision'],
        priceLabel: 'Text, vision',
      },
      {
        id: 'auto',
        label: 'Qwen Auto',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '1M',
        tags: ['Router'],
        priceLabel: 'Router',
      },
      {
        id: 'qwen3-max',
        label: 'Qwen3 Max',
        inputPricePerMTok: 2.5,
        outputPricePerMTok: 10,
        contextWindow: '262K',
        tags: ['Pay as you go'],
      },
      {
        id: 'qwen3.5-plus',
        label: 'Qwen3.5 Plus',
        inputPricePerMTok: 0.8,
        outputPricePerMTok: 4.8,
        contextWindow: '1M',
        tags: ['Pay as you go'],
      },
      {
        id: 'qwen3.5-flash',
        label: 'Qwen3.5 Flash',
        inputPricePerMTok: 0.2,
        outputPricePerMTok: 2,
        contextWindow: '1M',
        tags: ['Pay as you go', 'Fast'],
      },
      {
        id: 'decision-model-preview',
        label: 'Decision Model Preview',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '128K',
        free: true,
        tags: ['Limited-time free'],
        priceLabel: 'Limited-time free',
      },
      {
        id: 'deepseek-v4.1-flash-1017',
        label: 'DeepSeek V4.1 Flash 1017',
        inputPricePerMTok: 1,
        outputPricePerMTok: 2,
        contextWindow: '1M',
        tags: ['Night 50%', 'Vision'],
        priceLabel: '¥1/¥2 · night 50% of list',
      },
      {
        id: 'deepseek-v4.1-flash',
        label: 'DeepSeek V4.1 Flash',
        inputPricePerMTok: 1,
        outputPricePerMTok: 2,
        contextWindow: '1M',
        tags: ['Night 50%', 'Vision'],
        priceLabel: '¥1/¥2 · night 50% of list',
      },
      {
        id: 'deepseek-v4-pro-0813',
        label: 'DeepSeek V4 Pro 0813',
        inputPricePerMTok: 3,
        outputPricePerMTok: 6,
        contextWindow: '1M',
        tags: ['Night 50%'],
        priceLabel: '¥3/¥6 · night 50% of list',
      },
      {
        id: 'deepseek-v4-pro',
        label: 'DeepSeek V4 Pro',
        inputPricePerMTok: 3,
        outputPricePerMTok: 6,
        contextWindow: '1M',
        tags: ['Token Plan'],
        priceLabel: '¥3/¥6 · Token Plan',
      },
      {
        id: 'deepseek-v4-flash-0731',
        label: 'DeepSeek V4 Flash 0731',
        inputPricePerMTok: 1,
        outputPricePerMTok: 2,
        contextWindow: '1M',
        tags: ['Night 50%'],
        priceLabel: '¥1/¥2 · night 50% of list',
      },
      {
        id: 'glm-5.3',
        label: 'GLM-5.3',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '203K',
        tags: ['Token Plan'],
        priceLabel: 'Text, reasoning',
      },
      {
        id: 'glm-5.2',
        label: 'GLM-5.2',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '203K',
        tags: ['Token Plan'],
        priceLabel: 'Text, reasoning',
      },
      {
        id: 'qwen-audio-3.0-asr-flash',
        label: 'Qwen Audio ASR Flash',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '',
        kind: 'audio',
        priceLabel: 'Speech recognition',
      },
      {
        id: 'qwen-audio-3.0-realtime-plus',
        label: 'Qwen Audio Realtime Plus',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '',
        kind: 'realtime',
        priceLabel: 'Realtime speech',
      },
      {
        id: 'qwen-audio-3.0-tts-plus',
        label: 'Qwen Audio TTS Plus',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '',
        kind: 'audio',
        priceLabel: 'Speech synthesis',
      },
      {
        id: 'qwen-image-3.0-pro',
        label: 'Qwen Image 3.0 Pro',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '',
        kind: 'image',
        priceLabel: 'Image generation',
      },
      {
        id: 'wan2.7-image',
        label: 'Wan 2.7 Image',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '',
        kind: 'image',
        priceLabel: 'Image generation',
      },
      {
        id: 'wan2.7-image-pro',
        label: 'Wan 2.7 Image Pro',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '',
        kind: 'image',
        priceLabel: 'Image generation',
      },
      {
        id: 'wan3.0-video',
        label: 'Wan 3.0 Video',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '',
        kind: 'video',
        priceLabel: 'Video generation',
      },
      {
        id: 'happyhorse-1.1-r2v',
        label: 'HappyHorse 1.1 R2V',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '',
        kind: 'video',
        priceLabel: 'Video, reference to video',
      },
      {
        id: 'happyhorse-1.1-t2v',
        label: 'HappyHorse 1.1 T2V',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '',
        kind: 'video',
        priceLabel: 'Video, text to video',
      },
      {
        id: 'happyhorse-1.1-i2v',
        label: 'HappyHorse 1.1 I2V',
        inputPricePerMTok: 0,
        outputPricePerMTok: 0,
        contextWindow: '',
        kind: 'video',
        priceLabel: 'Video, image to video',
      },
    ],
  },
  {
    id: 'mimo',
    label: 'MiMo Xiaomi',
    description: '1M context, 128K output, Token Plan, open source',
    icon: '\u{1F4F1}',
    baseURL: 'https://api.xiaomimimo.com/v1',
    apiKeyPage: 'https://platform.xiaomimimo.com/api-keys',
    modelsPage: 'https://platform.xiaomimimo.com/models',
    freeTier: 'Credits for new users, mimo-v2-flash low cost',
    defaultModel: 'mimo-v2.5-pro',
    tiers: {
      haiku: 'mimo-v2-flash',
      sonnet: 'mimo-v2.5-pro',
      opus: 'mimo-v2.5-pro',
      fable: 'mimo-v2.5-pro',
    },
    keyFormat: 'sk-...',
    codingPlan: {
      baseURL: 'https://token-plan-cn.xiaomimimo.com/v1',
      keyFormat: 'tp-...',
      purchasePage: 'https://platform.xiaomimimo.com/token-plan',
      tiers: [
        {
          id: 'lite',
          label: 'Lite',
          price: '¥39/mo ($6/mo)',
          credits: '4.1B Credits/mo',
          description: 'Light use, all MiMo models',
        },
        {
          id: 'standard',
          label: 'Standard',
          price: '¥99/mo ($16/mo)',
          credits: '11B Credits/mo',
          description: '2.7x Lite, daily coding',
        },
        {
          id: 'pro',
          label: 'Pro',
          price: '¥329/mo ($50/mo)',
          credits: '38B Credits/mo',
          description: '9x Lite, heavy complex projects',
        },
        {
          id: 'max',
          label: 'Max',
          price: '¥659/mo ($100/mo)',
          credits: '82B Credits/mo',
          description: '20x Lite, team-level usage',
        },
      ],
    },
    models: [
      {
        id: 'mimo-v2.5-pro',
        label: 'MiMo V2.5 Pro',
        inputPricePerMTok: 3,
        outputPricePerMTok: 6,
        contextWindow: '1M',
        tags: ['Recommended', 'Flagship'],
      },
      {
        id: 'mimo-v2.5',
        label: 'MiMo V2.5',
        inputPricePerMTok: 1,
        outputPricePerMTok: 2,
        contextWindow: '1M',
        tags: ['Multimodal'],
      },
      {
        id: 'mimo-v2-flash',
        label: 'MiMo V2 Flash',
        inputPricePerMTok: 0.7,
        outputPricePerMTok: 2.1,
        contextWindow: '256K',
        tags: ['Fast'],
      },
    ],
  },
]

export function findChinaProviderById(id: string): ProviderPreset | undefined {
  return CHINA_LLM_PROVIDERS.find(p => p.id === id)
}

export function resolveChinaProviderBaseURL(
  providerId: string,
  mode: ChinaAccessMode,
): string {
  const provider = findChinaProviderById(providerId)
  if (!provider) return ''
  if (mode === 'token-plan' && provider.tokenPlan) {
    return provider.tokenPlan.baseURL
  }
  if (mode === 'coding-plan' && provider.codingPlan) {
    return provider.codingPlan.baseURL
  }
  return provider.baseURL
}

/**
 * Parse a display context-window string ('203K', '1M', '262K') into a token
 * count. The preset table stores display strings; the login flow uses this to
 * auto-set CLAUDE_CODE_MAX_CONTEXT_TOKENS so auto-compact triggers at the
 * model's real window instead of the 200k fallback. Returns undefined for
 * unparseable values (caller skips the auto-set).
 */
export function parseContextWindowTokens(
  contextWindow: string,
): number | undefined {
  const m = contextWindow.trim().match(/^(\d+(?:\.\d+)?)\s*([KM])$/i)
  if (!m) return undefined
  const n = parseFloat(m[1]!)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.round(m[2]!.toUpperCase() === 'M' ? n * 1_000_000 : n * 1_000)
}

/** Canonicalize without folding case-sensitive proxy paths or query values. */
function normalizeBaseURL(baseURL: string): string {
  const trimmed = baseURL.trim()
  try {
    return normalizeProviderBaseURL(
      trimmed,
      isDeepSeekBaseURL(trimmed) ? 'deepseek' : 'openai',
    )
  } catch {
    return trimmed.replace(/\/+$/, '')
  }
}

/**
 * Which preset (if any) the session is currently pointed at.
 *
 * Keyed on the base URL rather than a saved marker so it stays correct when the
 * user edits `OPENAI_BASE_URL` by hand or switches providers with `/provider` —
 * there is no state to fall out of sync. Coding-plan endpoints resolve to the
 * same preset as the pay-as-you-go one: same catalog, different billing.
 */
export function findChinaProviderByBaseURL(
  baseURL: string | undefined,
): ProviderPreset | undefined {
  if (!baseURL?.trim()) return undefined
  const target = normalizeBaseURL(baseURL)
  return CHINA_LLM_PROVIDERS.find(provider => {
    const urls = [
      provider.baseURL,
      provider.codingPlan?.baseURL,
      provider.tokenPlan?.baseURL,
      provider.tokenPlan?.anthropicBaseURL,
    ]
    return urls.some(
      url => url !== undefined && normalizeBaseURL(url) === target,
    )
  })
}

/**
 * A model id reduced to the checkpoint it names.
 *
 * Aggregators and gateways re-spell the same checkpoint two ways, and a strict
 * equality match saw neither: OpenRouter-style vendor prefixes (`zhipu/glm-4.7`,
 * `z-ai/glm-4.6`) and variant tags (`glm-4.6:free`, `…:exacto`). Both used to
 * fall through to the flat 200k fallback, which is wrong in both directions
 * here — GLM's catalog runs 203K–205K and MiniMax's runs to 1M.
 *
 * Deliberately NOT a substring or prefix match: `glm-4.7` and `glm-4.7-flash`
 * are different checkpoints with different windows, and guessing between them
 * is how a 1M window ends up on a 128k model.
 */
function checkpointId(modelId: string): string {
  const trimmed = modelId.trim().toLowerCase()
  if (!trimmed) return ''
  const withoutVendor = trimmed.slice(trimmed.lastIndexOf('/') + 1)
  const tag = withoutVendor.indexOf(':')
  return tag === -1 ? withoutVendor : withoutVendor.slice(0, tag)
}

/**
 * The real context window for a preset model, in tokens.
 *
 * One API key exposes the provider's whole catalog, and those catalogs mix
 * windows (GLM ships 203K models next to 205K ones). A single
 * CLAUDE_CODE_MAX_CONTEXT_TOKENS cannot describe that, so the window is looked
 * up per model instead — see getContextWindowForModel, where this sits below
 * the env override and above the 200k fallback.
 */
export function getChinaProviderContextWindow(
  modelId: string,
): number | undefined {
  const target = checkpointId(modelId)
  if (!target) return undefined
  for (const provider of CHINA_LLM_PROVIDERS) {
    for (const model of provider.models) {
      if (checkpointId(model.id) !== target) continue
      // Image, video, and speech models are not main-loop checkpoints.
      if (model.kind && model.kind !== 'text') return undefined
      return parseContextWindowTokens(model.contextWindow)
    }
  }
  return undefined
}

/** The independent provider default plus the four tier mappings for a preset. */
export function chinaProviderTierEnv(
  preset: ProviderPreset,
): Record<string, string> {
  return {
    OPENAI_MODEL: preset.defaultModel,
    OPENAI_DEFAULT_HAIKU_MODEL: preset.tiers.haiku,
    OPENAI_DEFAULT_SONNET_MODEL: preset.tiers.sonnet,
    OPENAI_DEFAULT_OPUS_MODEL: preset.tiers.opus,
    OPENAI_DEFAULT_FABLE_MODEL: preset.tiers.fable,
  }
}
