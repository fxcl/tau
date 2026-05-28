type TeamModeEffortValue = 'low' | 'medium' | 'high' | 'xhigh' | 'max' | number

const TEAM_MODE_EFFORT_LEVELS = new Set([
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
])

export type TeamModeModelState = {
  mainLoopModel: string | null
  mainLoopModelForSession: string | null
  effortValue?: TeamModeEffortValue
}

export type TeamModeOrchestratorStateRole = {
  provider: string
  model: string
  effort?: string | number
}

function parseTeamModeEffortValue(
  value: TeamModeOrchestratorStateRole['effort'],
): TeamModeEffortValue | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }
  const str = String(value).toLowerCase()
  if (TEAM_MODE_EFFORT_LEVELS.has(str)) {
    return str as TeamModeEffortValue
  }
  const numericValue = parseInt(str, 10)
  if (!Number.isNaN(numericValue) && Number.isInteger(numericValue)) {
    return numericValue
  }
  return undefined
}

export function applyTeamModeOrchestratorAppState<T extends TeamModeModelState>(
  prev: T,
  orchestrator: TeamModeOrchestratorStateRole,
): T {
  const effort = parseTeamModeEffortValue(orchestrator.effort)
  return {
    ...prev,
    mainLoopModel: orchestrator.model,
    mainLoopModelForSession: null,
    ...(orchestrator.provider === 'firstParty'
      ? { effortValue: effort }
      : effort !== undefined
        ? { effortValue: effort }
        : {}),
  } as T
}
