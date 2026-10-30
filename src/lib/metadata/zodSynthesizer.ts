import { z, ZodTypeAny } from 'zod';
import { EntityMetadata } from './types';

/**
 * Dynamic Zod Schema Synthesizer
 * Compiles runtime JSON EntityMetadata into a type-safe Zod validation schema.
 */
export function synthesizeZodSchema(metadata: EntityMetadata): z.ZodObject<any> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const [key, field] of Object.entries(metadata.fields)) {
    let fieldSchema: ZodTypeAny;

    switch (field.type) {
      case 'TEXT':
      case 'TEXTAREA': {
        let str = z.string();
        if (field.validation?.required) {
          str = str.min(1, field.validation.message || `${field.label.replace('*', '').trim()} is required.`);
        } else {
          str = str.optional() as any;
        }

        if (field.validation?.pattern) {
          try {
            const regex = new RegExp(field.validation.pattern);
            str = str.regex(regex, field.validation.message || `Invalid format for ${field.label}.`);
          } catch (e) {
            console.warn(`Invalid regex pattern for field ${key}:`, field.validation.pattern);
          }
        }
        fieldSchema = str;
        break;
      }

      case 'SELECT':
      case 'RADIO_GROUP': {
        let sel = z.string();
        if (field.validation?.required) {
          sel = sel.min(1, field.validation.message || `Please select an option for ${field.label.replace('*', '').trim()}.`);
        } else {
          sel = sel.optional() as any;
        }
        fieldSchema = sel;
        break;
      }

      case 'NUMBER':
      case 'CURRENCY_INR': {
        let num = z.coerce.number();
        if (field.validation?.required) {
          const minVal = field.validation.min ?? 1;
          num = num.min(minVal, field.validation.message || `${field.label.replace('*', '').trim()} must be at least ${minVal}.`);
        } else {
          num = num.optional() as any;
        }
        if (field.validation?.max) {
          num = num.max(field.validation.max, `Maximum value is ${field.validation.max}.`);
        }
        fieldSchema = num;
        break;
      }

      case 'CHECKBOX': {
        fieldSchema = z.boolean().default(field.defaultValue ?? false);
        break;
      }

      case 'MULTI_SELECT': {
        let arr = z.array(z.string());
        if (field.validation?.required) {
          arr = arr.min(1, field.validation.message || `Select at least one ${field.label.replace('*', '').trim()}.`);
        } else {
          arr = arr.optional() as any;
        }
        fieldSchema = arr;
        break;
      }

      case 'DATE': {
        let dt = z.string();
        if (field.validation?.required) {
          dt = dt.min(1, field.validation.message || `${field.label.replace('*', '').trim()} is required.`);
        } else {
          dt = dt.optional() as any;
        }
        fieldSchema = dt;
        break;
      }

      case 'FILE_UPLOAD': {
        fieldSchema = z.any().optional();
        break;
      }

      default:
        fieldSchema = z.any().optional();
        break;
    }

    shape[key] = fieldSchema;
  }

  return z.object(shape);
}

/**
 * Validates form values against synthesized Zod schema.
 * Returns either `{ success: true, data }` or `{ success: false, fieldErrors }`.
 */
export function validateFormValues(metadata: EntityMetadata, values: Record<string, any>) {
  const schema = synthesizeZodSchema(metadata);
  const result = schema.safeParse(values);

  if (result.success) {
    return { success: true, data: result.data, fieldErrors: {} };
  }

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const fieldPath = issue.path[0];
    if (fieldPath && typeof fieldPath === 'string') {
      fieldErrors[fieldPath] = issue.message;
    }
  }

  return { success: false, data: null, fieldErrors };
}

