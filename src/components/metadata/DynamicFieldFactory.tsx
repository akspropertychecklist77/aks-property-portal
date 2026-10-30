'use client';

import React from 'react';
import { FieldMetadata } from '@/lib/metadata/types';
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react';

interface DynamicFieldFactoryProps {
  fieldKey: string;
  field: FieldMetadata;
  value: any;
  error?: string;
  onChange: (key: string, value: any) => void;
  disabled?: boolean;
}

export function DynamicFieldFactory({
  fieldKey,
  field,
  value,
  error,
  onChange,
  disabled = false,
}: DynamicFieldFactoryProps) {
  const isRequired = field.validation?.required;

  return (
    <div className="space-y-1 text-xs">
      {/* Field Label */}
      <div className="flex items-center justify-between">
        <label htmlFor={fieldKey} className="block font-medium text-zinc-200">
          {field.label}
          {isRequired && <span className="text-amber-400 ml-0.5">*</span>}
        </label>
        {field.helperText && (
          <span className="text-[10px] text-zinc-400">{field.helperText}</span>
        )}
      </div>

      {/* Control Selector based on Field Type */}
      {field.type === 'TEXT' && (
        <input
          id={fieldKey}
          type="text"
          value={value ?? ''}
          placeholder={field.placeholder || ''}
          disabled={disabled || field.disabled}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className={`w-full bg-zinc-950 border rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 transition-colors focus:outline-none text-xs ${
            error
              ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20'
              : 'border-zinc-800 hover:border-zinc-700 focus:border-amber-500/50'
          }`}
        />
      )}

      {field.type === 'TEXTAREA' && (
        <textarea
          id={fieldKey}
          rows={3}
          value={value ?? ''}
          placeholder={field.placeholder || ''}
          disabled={disabled || field.disabled}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className={`w-full bg-zinc-950 border rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 transition-colors focus:outline-none text-xs ${
            error
              ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20'
              : 'border-zinc-800 hover:border-zinc-700 focus:border-amber-500/50'
          }`}
        />
      )}

      {field.type === 'SELECT' && (
        <select
          id={fieldKey}
          value={value ?? ''}
          disabled={disabled || field.disabled}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className={`w-full bg-zinc-950 border rounded-lg px-3 py-2 text-zinc-100 transition-colors focus:outline-none cursor-pointer text-xs ${
            error
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-zinc-800 hover:border-zinc-700 focus:border-amber-500/50'
          }`}
        >
          <option value="" disabled>
            Select an option...
          </option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-zinc-900 text-zinc-100">
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {field.type === 'NUMBER' && (
        <input
          id={fieldKey}
          type="number"
          value={value ?? ''}
          placeholder={field.placeholder || '0'}
          disabled={disabled || field.disabled}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className={`w-full bg-zinc-950 border rounded-lg px-3 py-2 text-zinc-100 font-mono transition-colors focus:outline-none text-xs ${
            error
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-zinc-800 hover:border-zinc-700 focus:border-amber-500/50'
          }`}
        />
      )}

      {field.type === 'CURRENCY_INR' && (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-amber-400 text-xs">
            ₹
          </span>
          <input
            id={fieldKey}
            type="number"
            value={value ?? ''}
            placeholder="0"
            disabled={disabled || field.disabled}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            className={`w-full bg-zinc-950 border rounded-lg pl-7 pr-3 py-2 text-zinc-100 font-mono transition-colors focus:outline-none text-xs ${
              error
                ? 'border-rose-500 focus:border-rose-500'
                : 'border-zinc-800 hover:border-zinc-700 focus:border-amber-500/50'
            }`}
          />
        </div>
      )}

      {field.type === 'DATE' && (
        <input
          id={fieldKey}
          type="date"
          value={value ?? ''}
          disabled={disabled || field.disabled}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className={`w-full bg-zinc-950 border rounded-lg px-3 py-2 text-zinc-100 font-mono transition-colors focus:outline-none text-xs ${
            error
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-zinc-800 hover:border-zinc-700 focus:border-amber-500/50'
          }`}
        />
      )}

      {field.type === 'CHECKBOX' && (
        <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition">
          <input
            id={fieldKey}
            type="checkbox"
            checked={Boolean(value)}
            disabled={disabled || field.disabled}
            onChange={(e) => onChange(fieldKey, e.target.checked)}
            className="w-4 h-4 rounded text-amber-500 bg-zinc-900 border-zinc-700 focus:ring-amber-500 cursor-pointer"
          />
          <span className="text-xs text-zinc-300 font-medium">
            {field.placeholder || field.label}
          </span>
        </label>
      )}

      {field.type === 'FILE_UPLOAD' && (
        <div className="bg-zinc-950 p-3 rounded-lg border border-dashed border-zinc-700 space-y-2">
          <input
            id={fieldKey}
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            disabled={disabled || field.disabled}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onChange(fieldKey, e.target.files[0]);
              }
            }}
            className="block w-full text-xs text-zinc-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-zinc-950 hover:file:bg-amber-400 cursor-pointer"
          />
          {value instanceof File && (
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 mt-1 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Ready: {value.name} ({(value.size / 1024).toFixed(1)} KB)</span>
            </p>
          )}
        </div>
      )}

      {/* Accessible Human Error Feedback */}
      {error && (
        <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 font-medium animate-in fade-in duration-150">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
