import { realpathSync } from 'fs'
import { resolve } from 'path'
import { getSessionId } from '../../bootstrap/state.js'
import { getCwd } from '../../utils/cwd.js'
import { logForDebugging } from '../../utils/debug.js'
import { errorMessage } from '../../utils/errors.js'
import { isPrebuiltToolToggleDisabled } from '../../utils/prebuiltToolToggles.js'
import { getInitialSettings } from '../../utils/settings/settings.js'
import { LSP_TOOL_NAME } from '../LSPTool/prompt.js'
import { AFT_VERSION } from './constants.js'

type AftBridgeModule = typeof import('@cortexkit/aft-bridge')
type AftBridgePool = InstanceType<AftBridgeModule['BridgePool']>

let bridgeModulePromise: Promise<AftBridgeModule> | null = null
let poolPromise: Promise<AftBridgePool> | null = null

const logger = {
  log(message: string) {
    logForDebugging(`[AFT] ${message}`)
  },
  warn(message: string) {
    logForDebugging(`[AFT] WARN ${message}`)
  },
  error(message: string) {
    logForDebugging(`[AFT] ERROR ${message}`)
  },
}

function loadBridgeModule(): Promise<AftBridgeModule> {
  bridgeModulePromise ??= import('@cortexkit/aft-bridge')
  return bridgeModulePromise
}

function getProjectRoot(): string {
  const cwd = getCwd()
  try {
    return realpathSync(cwd)
  } catch {
    return resolve(cwd)
  }
}

function timeoutForCommand(command: string): number | undefined {
  switch (command) {
    case 'outline':
    case 'ast_search':
    case 'call_tree':
    case 'callers':
    case 'trace_to':
    case 'trace_to_symbol':
    case 'impact':
    case 'trace_data':
    case 'lsp_diagnostics':
      return 60_000
    default:
      return undefined
  }
}

async function getPool(): Promise<AftBridgePool> {
  if (poolPromise) return poolPromise

  poolPromise = (async () => {
    const aft = await loadBridgeModule()
    aft.setActiveLogger(logger)
    const binaryPath = await aft.findBinary(AFT_VERSION)
    return new aft.BridgePool(
      binaryPath,
      {
        timeoutMs: 30_000,
        maxRestarts: 1,
        minVersion: AFT_VERSION,
        errorPrefix: '[tau-aft]',
        logger,
      },
      {
        // AFT currently accepts only these upstream harness ids. We use the
        // OpenCode-compatible protocol mode, but expose a separate tau tool
        // surface and never hoist/replace built-ins.
        harness: 'opencode',
        search_index: false,
        semantic_search: false,
        experimental_bash_rewrite: false,
        experimental_bash_compress: false,
        experimental_bash_background: false,
      },
    )
  })().catch(error => {
    poolPromise = null
    throw error
  })

  return poolPromise
}

export type AftCommandResponse = Record<string, unknown>

export async function callAftCommand(
  command: string,
  params: Record<string, unknown>,
): Promise<AftCommandResponse> {
  const pool = await getPool()
  const bridge = pool.getBridge(getProjectRoot())
  const sessionId = getSessionId()
  const timeoutMs = timeoutForCommand(command)
  return bridge.send(
    command,
    {
      ...params,
      ...(sessionId ? { session_id: sessionId } : {}),
    },
    timeoutMs === undefined ? undefined : { timeoutMs },
  )
}

export function formatAftUnavailable(error: unknown): string {
  const fallbackTools = isPrebuiltToolToggleDisabled(
    LSP_TOOL_NAME,
    getInitialSettings(),
  )
    ? 'Read, Grep, Glob, or Bash'
    : 'Read, Grep, Glob, Bash, or LSP'
  return [
    `AFT is unavailable: ${errorMessage(error)}`,
    '',
    `Tau normal tools are unchanged. Continue with ${fallbackTools} as needed.`,
  ].join('\n')
}
