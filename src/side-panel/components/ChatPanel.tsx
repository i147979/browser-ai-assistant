import { useState } from "react";
import { ChatPreferenceDrawer } from "./ChatPreferenceDrawer";
import { ChatComposer } from "./ChatComposer";
import { MessageList } from "./MessageList";
import { SessionHistoryDialog } from "./SessionHistoryDialog";
import { useAppStore } from "../state/appStore";

export function ChatPanel() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatPreferencesOpen, setChatPreferencesOpen] = useState(false);
  const providers = useAppStore((state) => state.providers);
  const models = useAppStore((state) => state.models);
  const selectedModelId = useAppStore((state) => state.selectedModelId);
  const chatRetryProgressByMessageId = useAppStore((state) => state.chatRetryProgressByMessageId);
  const regenerateMessage = useAppStore((state) => state.regenerateMessage);
  const editAndRegenerateUserMessage = useAppStore((state) => state.editAndRegenerateUserMessage);
  const sending = useAppStore((state) => state.sending);
  const pageContext = useAppStore((state) => state.pageContext);
  const toolCallDisplayMode = useAppStore((state) => state.chatPreferences.toolCallDisplayMode);
  const showToolCallProcessInAssistantMode = useAppStore((state) => state.chatPreferences.showToolCallProcessInAssistantMode);
  const contextMode = useAppStore((state) => state.contextMode);
  const extractionRules = useAppStore((state) => state.extractionRules);
  const storedActiveSession = useAppStore((state) => state.chatSessions.find((session) => session.id === state.activeSessionId));
  const privateModeActive = useAppStore((state) => state.privateModeActive);
  const privateChatSession = useAppStore((state) => state.privateChatSession);
  const activeSession = privateModeActive ? privateChatSession : storedActiveSession;
  const selectedModel = models.find((model) => model.id === selectedModelId);
  const selectedProvider = providers.find((provider) => provider.id === selectedModel?.providerId);
  const matchedRule = extractionRules.find((rule) => rule.id === pageContext.matchedRuleId);
  const canSend = Boolean(selectedModel?.enabled && selectedProvider?.enabled);
  const matchedRuleLabel = pageContext.usedFallback && pageContext.matchedRuleId
    ? "规则命中但无内容，已回退"
    : matchedRule
      ? `已匹配规则：${matchedRule.alias || matchedRule.urlPattern}`
      : contextMode === "all"
        ? "全局 HTML"
        : "全局文本";
  return (
    <section className="chat-panel">
      <MessageList
        messages={activeSession?.messages ?? []}
        toolAttachmentsById={activeSession?.toolAttachmentsById}
        retryProgressByMessageId={chatRetryProgressByMessageId}
        toolCallDisplayMode={toolCallDisplayMode}
        showToolCallProcessInAssistantMode={showToolCallProcessInAssistantMode}
        onRegenerateMessage={(messageId) => void regenerateMessage(messageId)}
        onEditAndRegenerateUserMessage={(messageId, content) => void editAndRegenerateUserMessage(messageId, content)}
        regenerating={sending}
      />
      {providers.length === 0 || models.length === 0 ? <p className="chat-warning">请先配置 API Key 后再开始对话</p> : null}
      <ChatComposer
        canSend={canSend}
        matchedRuleLabel={matchedRuleLabel}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenChatPreferences={() => setChatPreferencesOpen(true)}
      />
      <SessionHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
      <ChatPreferenceDrawer open={chatPreferencesOpen} onOpenChange={setChatPreferencesOpen} />
    </section>
  );
}
