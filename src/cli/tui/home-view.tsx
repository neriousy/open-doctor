// Home dashboard tiles for the top-level repair and utility flows.
import type { HomeAction } from "./types.js"

export function HomeView(props: {
  actions: HomeAction[]
  selected: number
  status: string
}) {
  return (
    <box id="home" flexGrow={1} flexShrink={1} flexDirection="column" marginTop={1}>
      <box id="action-row" height={10} flexDirection="row" columnGap={1}>
        {props.actions.map((action, index) => (
          <box
            key={action.title}
            width="50%"
            border
            borderColor={index === props.selected ? "#81a1c1" : "#263544"}
            padding={1}
            backgroundColor={index === props.selected ? "#17202a" : "#101820"}
          >
            <text fg={index === props.selected ? "#c3e88d" : "#7893ad"} height={1}>
              {`${action.eyebrow}  ${action.hotkey}`}
            </text>
            <text fg="#d6deeb" height={1}>
              {action.title}
            </text>
            <text fg="#9fb3c8" wrapMode="word">
              {action.detail}
            </text>
          </box>
        ))}
      </box>

      <box id="home-status" height={3} marginTop={1} paddingLeft={1}>
        <text fg="#9fb3c8" wrapMode="word">
          {props.status}
        </text>
      </box>
    </box>
  )
}
