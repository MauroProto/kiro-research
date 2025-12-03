"use client";

import { FormEvent, useRef, useEffect } from "react";

interface TerminalInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function TerminalInput({ value, onChange, onSubmit, isLoading, disabled }: TerminalInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  return (
    <form onSubmit={onSubmit} className="flex items-center text-base">
      <span className={disabled ? "text-[#5a5a6e] mr-2" : "text-[#4ade80] mr-2"}>~</span>
      <span className="text-[#a0a0b0] mr-2">research</span>
      <span className={disabled ? "text-[#5a5a6e] mr-2" : "text-[#4ade80] mr-2"}>$</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        disabled={isLoading || disabled}
        placeholder={disabled ? "Límite alcanzado" : ""}
        className={`flex-1 bg-transparent border-none outline-none caret-[#c6a0ff] ${
          disabled ? "text-[#5a5a6e] cursor-not-allowed" : "text-white"
        }`}
        autoComplete="off"
        spellCheck={false}
      />
      {isLoading && (
        <span className="text-[#c6a0ff] ml-2 animate-pulse">●</span>
      )}
      {disabled && !isLoading && (
        <span className="text-[#f472b6] ml-2 text-sm">🔒</span>
      )}
    </form>
  );
}
