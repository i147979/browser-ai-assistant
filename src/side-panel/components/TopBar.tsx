import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../state/appStore";
import { downloadChatSessionMarkdown, downloadChatSessionPdf, downloadChatSessionWord } from "../utils/chatMarkdownExport";
import { UpdateAvailableButton } from "./UpdateAvailableButton";

interface TopBarProps {
  historyPanelOpen: boolean;
  onToggleHistoryPanel: () => void;
}

export function TopBar({ historyPanelOpen, onToggleHistoryPanel }: TopBarProps) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const activeSession = useAppStore((state) =>
    state.privateModeActive ? state.privateChatSession : state.chatSessions.find((session) => session.id === state.activeSessionId),
  );
  const settingsOpen = useAppStore((state) => state.settingsOpen);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const privateModeActive = useAppStore((state) => state.privateModeActive);
  const enterPrivateMode = useAppStore((state) => state.enterPrivateMode);
  const savePrivateChatSession = useAppStore((state) => state.savePrivateChatSession);
  const addNotification = useAppStore((state) => state.addNotification);
  const sessionTitle = activeSession?.title || "新对话";
  const canExport = Boolean(activeSession && activeSession.messages.length > 0);
  const canShowPrivateButton = privateModeActive || !activeSession || activeSession.messages.length === 0;

  useEffect(() => {
    if (!exportMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !exportMenuRef.current?.contains(target)) {
        setExportMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [exportMenuOpen]);

  const handleExport = async (format: "markdown" | "word" | "pdf") => {
    if (!activeSession || activeSession.messages.length === 0) {
      return;
    }

    setExportMenuOpen(false);
    try {
      if (format === "word") {
        await downloadChatSessionWord(activeSession);
        addNotification({ type: "success", title: "导出完成", message: "Word 文件已开始下载" });
        return;
      }

      if (format === "pdf") {
        await downloadChatSessionPdf(activeSession);
        addNotification({ type: "success", title: "导出完成", message: "PDF 打印窗口已打开" });
        return;
      }

      downloadChatSessionMarkdown(activeSession);
      addNotification({ type: "success", title: "导出完成", message: "Markdown 文件已开始下载" });
    } catch (error: unknown) {
      addNotification({ type: "error", title: "导出失败", message: error instanceof Error ? error.message : "导出失败，请重试" });
    }
  };

  return (
    <section className="topbar">
      <button
        className="icon-btn tip-below"
        type="button"
        aria-label={historyPanelOpen ? "折叠历史对话" : "展开历史对话"}
        aria-expanded={historyPanelOpen}
        data-tip="会话列表"
        onClick={onToggleHistoryPanel}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16M4 12h16M4 19h10" />
        </svg>
      </button>
      <UpdateAvailableButton />
      <span className="topbar-title">{sessionTitle}</span>
      {canShowPrivateButton ? (
        <button
          className="icon-btn tip-below act-privacy"
          type="button"
          aria-label={privateModeActive ? "保存隐私对话" : "进入隐私模式"}
          data-tip={privateModeActive ? "保存隐私对话" : "进入隐私模式"}
          onClick={() => void (privateModeActive ? savePrivateChatSession() : enterPrivateMode())}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
        </button>
      ) : null}
      <div className="topbar-export-menu-wrap act-export" ref={exportMenuRef}>
        <button
          className="icon-btn tip-below"
          type="button"
          aria-label="导出当前聊天"
          aria-haspopup="menu"
          aria-expanded={exportMenuOpen}
          data-tip="导出"
          disabled={!canExport}
          onClick={() => setExportMenuOpen((value) => !value)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v11m0 0 4-4m-4 4-4-4" />
            <path d="M4 19h16" />
          </svg>
        </button>
        {exportMenuOpen ? (
          <div className="topbar-export-menu" role="menu">
            <button className="topbar-export-menu-item" type="button" role="menuitem" onClick={() => void handleExport("markdown")}>
              Markdown
            </button>
            <button className="topbar-export-menu-item" type="button" role="menuitem" onClick={() => void handleExport("word")}>
              Word
            </button>
            <button className="topbar-export-menu-item" type="button" role="menuitem" onClick={() => void handleExport("pdf")}>
              PDF
            </button>
          </div>
        ) : null}
      </div>
      <button
        className="icon-btn tip-below"
        type="button"
        aria-label="设置"
        data-tip="插件设置"
        aria-expanded={settingsOpen}
        onClick={() => setSettingsOpen(!settingsOpen)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.01a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
        </svg>
      </button>
    </section>
  );
}
