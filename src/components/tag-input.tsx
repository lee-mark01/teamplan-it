"use client";

import { useState } from "react";

interface TagInputProps {
  label: string;
  tags: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  allowCustom?: boolean;
  customPlaceholder?: string;
}

export default function TagInput({ label, tags, selected, onChange, allowCustom, customPlaceholder }: TagInputProps) {
  const [customValue, setCustomValue] = useState("");

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  const addCustom = () => {
    const v = customValue.trim();
    if (v && !selected.includes(v)) {
      onChange([...selected, v]);
      setCustomValue("");
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-text-2 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              selected.includes(tag)
                ? "bg-[#2a5a6a] text-white"
                : "bg-[#dceef4] text-[#2a5a6a] hover:bg-[#c8e4ee]"
            }`}
          >
            {tag}
          </button>
        ))}
        {allowCustom && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
              placeholder={customPlaceholder || "직접 입력"}
              className="px-3 py-1.5 rounded-full text-xs border border-dashed border-border-strong bg-white focus:outline-none focus:border-accent w-[120px]"
            />
          </div>
        )}
      </div>
      {/* 커스텀 태그 표시 */}
      {selected.filter((s) => !tags.includes(s)).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.filter((s) => !tags.includes(s)).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#2a5a6a] text-white"
            >
              {tag}
              <button type="button" onClick={() => toggle(tag)} className="hover:text-red-200 cursor-pointer">
                <i className="ti ti-x text-[10px]" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
