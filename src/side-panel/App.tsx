import { useEffect, useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { NotificationHost } from "./components/NotificationHost";
import { SettingsPanel } from "./components/SettingsPanel";
import { SessionList } from "./components/SessionList";
import { TopBar } from "./components/TopBar";
import { useTipEdgeClamp } from "./components/Tip";
import { useAppStore } from "./state/appStore";
import {
  BROWSER_CONTROL_AUTOMATION_MODE_CHANGED_MESSAGE_TYPE,
  BROWSER_CONTROL_BOUNDARY_CHOICE_REQUEST_MESSAGE_TYPE,
  BROWSER_CONTROL_DETACHED_MESSAGE_TYPE,
  type BrowserControlAutomationModeChangedMessage,
  type BrowserControlBoundaryChoiceRequestMessage,
  type BrowserControlRuntimeEvent,
} from "../shared/browserControl";

export function App() {
  useTipEdgeClamp();
  const showSettings = useAppStore((state) => state.settingsOpen);
  const historyPanelDefaultOpen = useAppStore((state) => state.chatPreferences.historyDrawerDefaultOpen);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(historyPanelDefaultOpen);
  const loadChannelConfig = useAppStore((state) => state.loadChannelConfig);
  const loadExtractionRules = useAppStore((state) => state.loadExtractionRules);
  const loadPromptTemplates = useAppStore((state) => state.loadPromptTemplates);
  const loadChatData = useAppStore((state) => state.loadChatData);
  const loadSyncSettings = useAppStore((state) => state.loadSyncSettings);
  const refreshPageContext = useAppStore((state) => state.refreshPageContext);
  const markBrowserControlDetached = useAppStore((state) => state.markBrowserControlDetached);
  const markBrowserAutomationModeChanged = useAppStore((state) => state.markBrowserAutomationModeChanged);
  const showBoundaryChoiceRequest = useAppStore((state) => state.showBoundaryChoiceRequest);

  useEffect(() => {
    void Promise.all([loadChannelConfig(), loadExtractionRules(), loadPromptTemplates(), loadChatData(), loadSyncSettings()]).then(() => refreshPageContext());
  }, [loadChannelConfig, loadExtractionRules, loadPromptTemplates, loadChatData, loadSyncSettings, refreshPageContext]);

  useEffect(() => {
    setHistoryPanelOpen(historyPanelDefaultOpen);
  }, [historyPanelDefaultOpen]);

  useEffect(() => {
    const runtime = globalThis.chrome?.runtime;
    if (!runtime?.onMessage?.addListener) {
      return;
    }

    const handleRuntimeMessage = (message: unknown) => {
      if (isBrowserControlDetachedEvent(message)) {
        markBrowserControlDetached();
        return;
      }

      if (isAutomationModeChangedEvent(message)) {
        markBrowserAutomationModeChanged(message.mode);
        return;
      }

      if (isBoundaryChoiceRequestEvent(message)) {
        showBoundaryChoiceRequest(message);
      }
    };

    runtime.onMessage.addListener(handleRuntimeMessage);
    return () => {
      runtime.onMessage.removeListener?.(handleRuntimeMessage);
    };
  }, [markBrowserAutomationModeChanged, markBrowserControlDetached, showBoundaryChoiceRequest]);

  return (
    <main className="app-shell">
      <TopBar historyPanelOpen={historyPanelOpen} onToggleHistoryPanel={() => setHistoryPanelOpen((value) => !value)} />
      <section className={showSettings ? "settings-main-layout" : "chat-main-layout"}>
        {showSettings ? (
          <SettingsPanel />
        ) : (
          <>
            {historyPanelOpen ? <SessionList /> : null}
            <ChatPanel />
          </>
        )}
      </section>
      <NotificationHost />
    </main>
  );
}

function isBrowserControlDetachedEvent(message: unknown): message is BrowserControlRuntimeEvent {
  if (typeof message !== "object" || message === null) {
    return false;
  }

  const event = message as { type?: unknown; tabId?: unknown; reason?: unknown };
  return event.type === BROWSER_CONTROL_DETACHED_MESSAGE_TYPE &&
    (typeof event.tabId === "undefined" || typeof event.tabId === "number") &&
    (
      event.reason === "canceled_by_user" ||
      event.reason === "target_closed" ||
      event.reason === "tab_removed" ||
      event.reason === "disabled_by_user" ||
      event.reason === "unknown"
    );
}

function isAutomationModeChangedEvent(message: unknown): message is BrowserControlAutomationModeChangedMessage {
  if (typeof message !== "object" || message === null) {
    return false;
  }

  const event = message as { type?: unknown; mode?: unknown; tabId?: unknown; expiresAt?: unknown };
  return event.type === BROWSER_CONTROL_AUTOMATION_MODE_CHANGED_MESSAGE_TYPE &&
    (event.mode === "normal_restricted" || event.mode === "controlled_enhanced" || event.mode === "full_access") &&
    (typeof event.tabId === "undefined" || typeof event.tabId === "number") &&
    (typeof event.expiresAt === "undefined" || typeof event.expiresAt === "number");
}

function isBoundaryChoiceRequestEvent(message: unknown): message is BrowserControlBoundaryChoiceRequestMessage {
  if (typeof message !== "object" || message === null) {
    return false;
  }
  const event = message as { type?: unknown; requestId?: unknown; question?: unknown; choices?: unknown; expiresAt?: unknown };
  return event.type === BROWSER_CONTROL_BOUNDARY_CHOICE_REQUEST_MESSAGE_TYPE &&
    typeof event.requestId === "string" &&
    typeof event.question === "string" &&
    Array.isArray(event.choices) &&
    typeof event.expiresAt === "number";
}
