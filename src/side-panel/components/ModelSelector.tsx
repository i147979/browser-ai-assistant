import { useEffect, useMemo, useRef, useState } from "react";

import { useAppStore } from "../state/appStore";
import { formatModelLabelWithVision } from "./ModelVisionIndicator";

export function ModelSelector() {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const providers = useAppStore((state) => state.providers);
  const models = useAppStore((state) => state.models);
  const selectedModelId = useAppStore((state) => state.selectedModelId);
  const selectModel = useAppStore((state) => state.selectModel);
  const selectableModels = useMemo(() => {
    const providerById = new Map(providers.map((provider, index) => [provider.id, { provider, index }]));
    return models
      .flatMap((model, modelIndex) => {
        const providerItem = providerById.get(model.providerId);
        return providerItem?.provider.enabled && model.enabled
          ? {
              id: model.id,
              label: formatModelLabelWithVision(`${providerItem.provider.name} / ${model.displayName}`, model.supportsVision),
              modelIndex,
              providerIndex: providerItem.index,
              providerName: providerItem.provider.name,
            }
          : [];
      })
      // 按渠道配置顺序分组，同一渠道内保留模型原有顺序，避免不同渠道模型在下拉框中穿插显示。
      .sort((left, right) => left.providerIndex - right.providerIndex || left.modelIndex - right.modelIndex);
  }, [models, providers]);

  const groups = useMemo(() => {
    const grouped: Array<{ providerName: string; models: typeof selectableModels }> = [];
    for (const item of selectableModels) {
      const last = grouped[grouped.length - 1];
      if (last && last.providerName === item.providerName) {
        last.models.push(item);
      } else {
        grouped.push({ providerName: item.providerName, models: [item] });
      }
    }
    return grouped;
  }, [selectableModels]);

  const selectedLabel = selectableModels.find((item) => item.id === selectedModelId)?.label ?? "未选择模型";

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (wrapRef.current && event.target instanceof Node && !wrapRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="model-selector" ref={wrapRef}>
      <label className="model-select-label model-select-label-inline model-select-visually-hidden">
        <span className="model-select-text">当前模型</span>
        <select
          className="ui-input model-select-input"
          value={selectedModelId}
          onChange={(event) => selectModel(event.target.value)}
        >
          <option value="">未选择模型</option>
          {selectableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
      </label>
      <button
        className="model-pill"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        data-tip="切换模型"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="model-pill-name">{selectedLabel}</span>
        <svg className="model-pill-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {menuOpen ? (
        <div className="model-select-menu" role="listbox" aria-label="当前模型">
          {groups.map((group) => (
            <div key={`${group.providerName}-${group.models[0]?.id ?? ""}`} className="model-menu-group">
              <div className="model-menu-group-title">{group.providerName}</div>
              {group.models.map((model) => {
                const selected = model.id === selectedModelId;
                return (
                  <button
                    key={model.id}
                    className={`model-menu-option${selected ? " model-menu-option-active" : ""}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      selectModel(model.id);
                      setMenuOpen(false);
                    }}
                  >
                    <span className="model-menu-option-name">{model.label}</span>
                    {selected ? (
                      <svg className="model-menu-check" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m5 12 4 4L19 6" />
                      </svg>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
