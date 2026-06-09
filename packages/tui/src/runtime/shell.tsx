import { useMemo } from "react"
import { CommandPalette } from "../component/command-palette.js"
import { ConfirmationModal } from "../ui/confirmation-modal.js"
import { HelpOverlay } from "../component/help-overlay.js"
import { AppShell, Footer, HeaderStatus } from "../ui/primitives.js"
import { ToastView } from "../ui/toast-view.js"
import { useConfirmDialog } from "../ui/dialog-confirm.js"
import { useHealth } from "../context/health.js"
import { useOverlays } from "../context/overlays.js"
import { useRoute } from "../context/route.js"
import { useToastContext } from "../ui/toast.js"
import { ScreenRouter } from "./router.js"
import { footerForContext, helpContext } from "./footer.js"
import { sectionForView } from "../ui/workspace-sidebar.js"

export function ToolkitShell() {
  const health = useHealth()
  const route = useRoute()
  const confirmation = useConfirmDialog()
  const toast = useToastContext()
  const overlayState = useOverlays()

  const header = useMemo(
    () => (
      <HeaderStatus
        title="Open Doctor"
        dataPath={health.snapshot.dataDir}
      />
    ),
    [health.snapshot.dataDir],
  )

  const footer = useMemo(
    () => <Footer text={footerForContext(route.location.view, sectionForView(route.location.view), health.snapshot.workspaceRepair.status, confirmation.current, route.flags.restoreImplemented)} />,
    [confirmation.current, health.snapshot.workspaceRepair.status, route.flags.restoreImplemented, route.location.view],
  )

  const overlayLayer = useMemo(
    () => (
      <>
        {toast.current ? <ToastView toast={toast.current} /> : null}
        {confirmation.current ? <ConfirmationModal confirmation={confirmation.current} /> : null}
        {overlayState.help.open ? <HelpOverlay context={helpContext(route.location.view, sectionForView(route.location.view), health.snapshot.workspaceRepair.status, confirmation.current, route.flags.restoreImplemented)} /> : null}
        {overlayState.palette.open ? <CommandPalette query={overlayState.palette.query} items={overlayState.palette.items} selected={overlayState.palette.selected} /> : null}
      </>
    ),
    [
      confirmation.current,
      health.snapshot.workspaceRepair.status,
      overlayState.help.open,
      overlayState.palette.open,
      overlayState.palette.query,
      overlayState.palette.selected,
      route.flags.restoreImplemented,
      toast.current,
      route.location.view,
      overlayState.palette.items,
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
