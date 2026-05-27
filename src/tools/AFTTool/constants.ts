export const AFT_VERSION = '0.31.1'

export const AFT_OUTLINE_TOOL_NAME = 'AFTOutline'
export const AFT_ZOOM_TOOL_NAME = 'AFTZoom'
export const AFT_AST_SEARCH_TOOL_NAME = 'AFTAstSearch'
export const AFT_NAVIGATE_TOOL_NAME = 'AFTNavigate'
export const AFT_DIAGNOSTICS_TOOL_NAME = 'AFTDiagnostics'

export function isAftEnabled(): boolean {
  const value = process.env.TAU_AFT ?? process.env.CLAUDEX_AFT
  if (value && ['0', 'false', 'off', 'no'].includes(value.toLowerCase())) {
    return false
  }
  const disable = process.env.TAU_DISABLE_AFT ?? process.env.CLAUDEX_DISABLE_AFT
  return !(
    disable && ['1', 'true', 'on', 'yes'].includes(disable.toLowerCase())
  )
}
