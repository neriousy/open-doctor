import { useMemo } from "react"
import { CommandPalette } from "../component/command-palette.js"
import { ConfirmationModal } from "../ui/confirmation-modal.js"
import { HelpOverlay } from "../component/help-overlay.js"
import { AppShell, Footer, HeaderStatus } from "../ui/primitives.js"
import { ToastView } from "../ui/toast-view.js"
import { useConfirmDialog } from "../ui/dialog-confirm.js"
import { useHealth } from "../context/health.js"
import { useOverview } from "../context/overview.js"
import { useOverlays } from "../context/overlays.js"
import { useRoute } from "../context/route.js"
import { useToastContext } from "../ui/toast.js"
import { ScreenRouter } from "./router.js"
import { footerForContext, helpContext } from "./footer.js"
import { repairCountForHeader } from "../util/status.js"

export function ToolkitShell() {
  const health = useHealth()
  const route = useRoute()
  const overview = useOverview()
  const confirmation = useConfirmDialog()
  const toast = useToastContext()
  const overlayState = useOverlays()

  const header = useMemo(
    () => (
      <HeaderStatus
        title="Open Doctor"
        dataPath={health.health.dataDir}
        repairCount={repairCountForHeader(health.health.workspaceRepair.status)}
        archivedCount={health.health.archivedCount}
        logErrorCount={health.health.logErrorCount}
        backupStatus={health.health.backupStatus}
      />
    ),
    [health.health.archivedCount, health.health.backupStatus, health.health.dataDir, health.health.logErrorCount, health.health.workspaceRepair.status],
  )

  const footer = useMemo(
    () => <Footer text={footerForContext(route.view, overview.activeSection, health.health.workspaceRepair.status, confirmation.confirmation, route.restoreImplemented)} />,
    [overview.activeSection, confirmation.confirmation, health.health.workspaceRepair.status, route.restoreImplemented, route.view],
  )

  const overlayLayer = useMemo(
    () => (
      <>
        {toast.toast ? <ToastView toast={toast.toast} /> : null}
        {confirmation.confirmation ? <ConfirmationModal confirmation={confirmation.confirmation} /> : null}
        {overlayState.helpOpen ? <HelpOverlay context={helpContext(route.view, overview.activeSection, health.health.workspaceRepair.status, confirmation.confirmation, route.restoreImplemented)} /> : null}
        {overlayState.paletteOpen ? <CommandPalette query={overlayState.paletteQuery} items={overlayState.visibleCommandItems} selected={overlayState.paletteSelected} /> : null}
      </>
    ),
    [
      overview.activeSection,
      confirmation.confirmation,
      health.health.workspaceRepair.status,
      overlayState.helpOpen,
      overlayState.paletteOpen,
      overlayState.paletteQuery,
      overlayState.paletteSelected,
      route.restoreImplemented,
      toast.toast,
      route.view,
      overlayState.visibleCommandItems,
    ],
  )

  return (
    <AppShell
      header={header}
      main={<ScreenRouter />}
      footer={footer}
      overlays={overlayLayer}
    />
  )
}
