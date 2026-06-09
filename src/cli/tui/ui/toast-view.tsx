// Transient notification overlay modelled after opencode's TUI toast placement.
import { toastColor } from "../util/format.js"
import { Box, Text } from "./primitives.js"
import type { ToastState } from "../types.js"

export function ToastView(props: { toast: ToastState }) {
  return (
    <Box
      id="toast"
      position="absolute"
      top={2}
      right={2}
      width={48}
      border
      borderColor={toastColor(props.toast.variant)}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      backgroundColor="#101820"
    >
      <Text fg="#d6deeb" wrapMode="word">
        {props.toast.title ? `${props.toast.title}\n${props.toast.message}` : props.toast.message}
      </Text>
    </Box>
  )
}
