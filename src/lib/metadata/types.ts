export type FieldType = 
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'CURRENCY_INR'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'DATE'
  | 'DATE_RANGE'
  | 'CHECKBOX'
  | 'RADIO_GROUP'
  | 'FILE_UPLOAD';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface FieldMetadata {
  type: FieldType;
  label: string;
  placeholder?: string;
  defaultValue?: any;
  validation?: FieldValidation;
  options?: FieldOption[];
  optionsSource?: 'STATIC' | 'API_ENDPOINT';
  optionsEndpoint?: string;
  helperText?: string;
  disabled?: boolean;
}

export interface SectionMetadata {
  id: string;
  title: string;
  description?: string;
  columns?: 1 | 2 | 3 | 4;
  fieldKeys: string[];
  visibilityCondition?: string;
}

export interface EntityMetadata {
  entityKey: string;
  displayName: string;
  storageTable: string;
  version?: number;
  sections: SectionMetadata[];
  fields: Record<string, FieldMetadata>;
}

