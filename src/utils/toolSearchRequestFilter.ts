import type { Tools } from '../Tool.js'
import { TOOL_SEARCH_TOOL_NAME } from '../tools/ToolSearchTool/constants.js'
import type { APIProvider } from './model/providers.js'

export function selectToolsForToolSearchRequest(
  tools: Tools,
  options: {
    useToolSearch: boolean
    useNativeLaneToolSearch: boolean
    deferredToolNames: ReadonlySet<string>
    discoveredToolNames: ReadonlySet<string>
    provider: APIProvider
  },
): Tools {
  if (options.useToolSearch && options.provider === 'firstParty') {
    return tools
  }

  if (options.useToolSearch || options.useNativeLaneToolSearch) {
    return tools.filter(tool => {
      if (!options.deferredToolNames.has(tool.name)) return true
      if (tool.name === TOOL_SEARCH_TOOL_NAME) return true
      return options.discoveredToolNames.has(tool.name)
    })
  }

  return tools.filter(tool => tool.name !== TOOL_SEARCH_TOOL_NAME)
}
