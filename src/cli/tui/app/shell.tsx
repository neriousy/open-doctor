import type { ReactNode } from "react"
import { CommandPalette } from "../command-palette.js"
import { ConfirmationModal } from "../confirmation-modal.js"
import { HelpOverlay } from "../help-overlay.js"
import type { ToolkitHealth } from "../health.js"
import { AppShell, Footer, HeaderStatus } from "../primitives.js"
import { ToastView } from "../toast-view.js"
import type { CommandPaletteAction } from "./actions.js"
import { footerForContext, helpContext } from "./footer.js"
import { repairCountForHeader } from "./status.js"
import type { ConfirmationRequest, SidebarSection, ToastState, View } from "../types.js"

export function ToolkitShell(props: {
  health: ToolkitHealth
  view: View
  activeSection: SidebarSection
  confirmation: ConfirmationRequest | null
  restoreImplemented: boolean
  main: ReactNode
  toast: ToastState | null
  helpOpen: boolean
  paletteOpen: boolean
  paletteQuery: string
  visibleCommandItems: CommandPaletteAction[]
  paletteSelected: number
}) {
  return (
    <AppShell
      header={
        <HeaderStatus
          title="Open Doctor"
          dataPath={props.health.dataDir}
          repairCount={repairCountForHeader(props.health.workspaceRepair.status)}
          archivedCount={props.health.archivedCount}
          logErrorCount={props.health.logErrorCount}
          backupStatus={props.health.backupStatus}
        />
      }
      main={props.main}
      footer={<Footer text={footerForContext(props.view, props.activeSection, props.health.workspaceRepair.status, props.confirmation, props.restoreImplemented)} />}
      overlays={
        <>
          {props.toast ? <ToastView toast={props.toast} /> : null}
          {props.confirmation ? <ConfirmationModal confirmation={props.confirmation} /> : null}
          {props.helpOpen ? <HelpOverlay context={helpContext(props.view, props.activeSection, props.health.workspaceRepair.status, props.confirmation, props.restoreImplemented)} /> : null}
          {props.paletteOpen ? <CommandPalette query={props.paletteQuery} items={props.visibleCommandItems} selected={props.paletteSelected} /> : null}
        </>
      }
    />
  )
}
