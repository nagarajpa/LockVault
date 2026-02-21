import { useState, useEffect, useCallback } from "react";
import type { PasswordGeneratorOptions } from "@shared/types";
import {
  generatePassword,
  calculateEntropy,
  getStrengthLabel,
  DEFAULT_OPTIONS,
} from "@shared/passwordGenerator";

export default function PasswordGenerator() {
  const [options, setOptions] = useState<PasswordGeneratorOptions>(DEFAULT_OPTIONS);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const entropy = calculateEntropy(options);
  const strength = getStrengthLabel(entropy);

  const generate = useCallback(() => {
    setPassword(generatePassword(options));
    setCopied(false);
  }, [options]);

  useEffect(() => {
    generate();
  }, [generate]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleOption = (key: keyof Omit<PasswordGeneratorOptions, "length">) => {
    const enabledCount = [options.uppercase, options.lowercase, options.numbers, options.symbols].filter(Boolean).length;
    if (options[key] && enabledCount <= 1) return;
    setOptions((o) => ({ ...o, [key]: !o[key] }));
  };

  return (
    <div className="flex flex-col h-full px-4 py-4">
      <h2 className="text-lg font-bold text-white mb-4">Generate Password</h2>

      {/* Password display */}
      <div className="bg-navy-700 rounded-lg p-4 mb-4">
        <p className="text-base font-mono text-white break-all leading-relaxed min-h-[3rem]">
          {password}
        </p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${Math.min(entropy, 128) / 1.28}%`,
                minWidth: "8px",
                maxWidth: "100px",
                backgroundColor: strength.color,
              }}
            />
            <span className="text-xs font-medium" style={{ color: strength.color }}>
              {strength.label}
            </span>
            <span className="text-xs text-slate-500">{entropy} bits</span>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 text-teal-400 rounded-md text-xs font-medium hover:bg-teal-500/30 transition-colors"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Length slider */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-300">Length</span>
          <span className="text-sm font-mono text-teal-400 bg-navy-700 px-2 py-0.5 rounded">
            {options.length}
          </span>
        </div>
        <input
          type="range"
          min={8}
          max={128}
          value={options.length}
          onChange={(e) =>
            setOptions((o) => ({ ...o, length: Number(e.target.value) }))
          }
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>8</span>
          <span>128</span>
        </div>
      </div>

      {/* Character toggles */}
      <div className="space-y-3 mb-6">
        {[
          { key: "uppercase" as const, label: "A-Z", desc: "Uppercase" },
          { key: "lowercase" as const, label: "a-z", desc: "Lowercase" },
          { key: "numbers" as const, label: "0-9", desc: "Numbers" },
          { key: "symbols" as const, label: "!@#$", desc: "Symbols" },
        ].map(({ key, label, desc }) => (
          <div
            key={key}
            className="flex items-center justify-between bg-navy-700 rounded-lg px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-teal-400 bg-navy-800 px-2 py-1 rounded w-12 text-center">
                {label}
              </span>
              <span className="text-sm text-slate-300">{desc}</span>
            </div>
            <button
              onClick={() => toggleOption(key)}
              className={`w-10 h-5.5 rounded-full transition-colors relative ${
                options[key] ? "bg-teal-500" : "bg-navy-600"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${
                  options[key] ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M15.015 4.382v4.993" />
        </svg>
        Generate New
      </button>
    </div>
  );
}
