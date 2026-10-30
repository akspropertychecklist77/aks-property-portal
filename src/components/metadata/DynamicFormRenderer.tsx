'use client';

import React, { useState, useEffect } from 'react';
import { EntityMetadata } from '@/lib/metadata/types';
import { validateFormValues } from '@/lib/metadata/zodSynthesizer';
import { DynamicFieldFactory } from './DynamicFieldFactory';
import { AlertCircle, CheckCircle2, RotateCcw, Save, X } from 'lucide-react';

interface DynamicFormRendererProps {
  schema: EntityMetadata;
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
  submitButtonText?: string;
  isSubmitting?: boolean;
}

export function DynamicFormRenderer({
  schema,
  initialValues = {},
  onSubmit,
  onCancel,
  submitButtonText = 'Save to Database',
  isSubmitting = false,
}: DynamicFormRendererProps) {
  // Initialize form state from default values or provided initial values
  const [formState, setFormState] = useState<Record<string, any>>(() => {
    const defaults: Record<string, any> = {};
    for (const [key, field] of Object.entries(schema.fields)) {
      if (initialValues[key] !== undefined) {
        defaults[key] = initialValues[key];
      } else if (field.defaultValue !== undefined) {
        defaults[key] = field.defaultValue;
      } else {
        defaults[key] = field.type === 'CHECKBOX' ? false : '';
      }
    }
    return defaults;
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleFieldChange = (key: string, value: any) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    // Clear field-specific error as user types
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
    if (generalError) setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // 1. Run dynamic Zod validation against metadata
    const validation = validateFormValues(schema, formState);
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors);
      setGeneralError('Please correct the highlighted fields before submitting.');
      return;
    }

    // 2. Delegate to parent onSubmit handler
    try {
      await onSubmit(formState);
    } catch (err: any) {
      setGeneralError(err.message || 'Submission failed. Please check details and try again.');
    }
  };

  const handleReset = () => {
    const defaults: Record<string, any> = {};
    for (const [key, field] of Object.entries(schema.fields)) {
      defaults[key] = field.defaultValue !== undefined ? field.defaultValue : (field.type === 'CHECKBOX' ? false : '');
    }
    setFormState(defaults);
    setFieldErrors({});
    setGeneralError(null);
  };

  const getGridColsClass = (columns?: number) => {
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 3:
        return 'grid-cols-1 sm:grid-cols-3';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      case 2:
      default:
        return 'grid-cols-1 sm:grid-cols-2';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Top Error Alert Banner */}
      {generalError && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{generalError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGeneralError(null)}
            className="text-zinc-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sections and Grid Layout */}
      {schema.sections.map((section) => (
        <div
          key={section.id}
          className="p-4 sm:p-5 rounded-xl bg-[#121215] border border-zinc-800/80 space-y-4"
        >
          <div className="border-b border-zinc-800/80 pb-2">
            <h4 className="font-semibold text-xs text-zinc-100 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-amber-500 rounded-full inline-block" />
              <span>{section.title}</span>
            </h4>
            {section.description && (
              <p className="text-[11px] text-zinc-400 mt-0.5">{section.description}</p>
            )}
          </div>

          <div className={`grid gap-3.5 ${getGridColsClass(section.columns)}`}>
            {section.fieldKeys.map((fieldKey) => {
              const fieldConfig = schema.fields[fieldKey];
              if (!fieldConfig) return null;

              return (
                <DynamicFieldFactory
                  key={fieldKey}
                  fieldKey={fieldKey}
                  field={fieldConfig}
                  value={formState[fieldKey]}
                  error={fieldErrors[fieldKey]}
                  onChange={handleFieldChange}
                  disabled={isSubmitting}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={handleReset}
          disabled={isSubmitting}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs flex items-center gap-1.5 transition border border-zinc-800 disabled:opacity-50"
        >
          <RotateCcw className="w-3 h-3 text-zinc-400" />
          <span>Reset</span>
        </button>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs transition border border-zinc-800"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-sm shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : submitButtonText}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
