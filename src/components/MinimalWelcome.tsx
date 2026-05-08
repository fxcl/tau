import * as React from 'react'
import { Box, Text } from '../ink.js'
import { useMainLoopModel } from '../hooks/useMainLoopModel.js'
import { renderModelName } from '../utils/model/model.js'
import { getLogoDisplayData } from '../utils/logoV2Utils.js'

/**
 * Studio welcome header: clean centered text — version on top, brand
 * name in primary, then "model · provider" and the working directory.
 * No outer frame, no ASCII art, no email/organization line.
 */
export function MinimalWelcome(): React.ReactNode {
  const model = useMainLoopModel()
  const { version, cwd, billingType } = getLogoDisplayData()
  const modelName = model ? renderModelName(model) : ''
  const modelLine =
    modelName && billingType
      ? `${modelName} · ${billingType}`
      : modelName || billingType

  return (
    <Box flexDirection="column" alignItems="center" width="100%" paddingY={1}>
      <Text dimColor>Tau v{version}</Text>
      <Box marginTop={1}>
        <Text bold color="primary">
          Tau
        </Text>
      </Box>
      {modelLine ? <Text dimColor>{modelLine}</Text> : null}
      <Text dimColor>{cwd}</Text>
    </Box>
  )
}
