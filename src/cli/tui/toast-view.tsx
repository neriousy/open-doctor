// Transient notification overlay modelled after opencode's TUI toast placement.
import { toastColor } from "./format.js"
import type { ToastState } from "./types.js"

export function ToastView(props: { toast: ToastState }) {
  return (
    <box
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
      <text fg="#d6deeb" wrapMode="word">
        {props.toast.title ? `${props.toast.title}\n${props.toast.message}` : props.toast.message}
      </text>
    </box>
  )
}
