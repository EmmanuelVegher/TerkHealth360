/**
 * OpenMRS ESM Form Engine Type Definitions
 * Replicated from @openmrs/esm-form-engine-lib & @openmrs/esm-form-builder
 */

export interface FormSchema {
  name: string;
  uuid?: string;
  processor?: string;
  encounterType?: string;
  version?: string;
  description?: string;
  published?: boolean;
  retired?: boolean;
  pages: FormPage[];
  referencedForms?: ReferencedForm[];
  allowUnspecifiedAll?: boolean;
  defaultPage?: string;
  readonly?: string | boolean;
  inlineRendering?: 'single-line' | 'multiline' | 'automatic';
  markdown?: string;
  formOptions?: {
    usePreviousValueDisabled?: boolean;
  };
  translations?: Record<string, string>;
  meta?: {
    programs?: {
      hasProgramFields?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export interface FormPage {
  id?: string;
  label: string;
  isHidden?: boolean;
  hide?: HideProps;
  sections: FormSection[];
  isSubform?: boolean;
  inlineRendering?: 'single-line' | 'multiline' | 'automatic';
  readonly?: string | boolean;
  subform?: {
    name?: string;
    package?: string;
    form?: FormSchema;
  };
}

export interface FormSection {
  id?: string;
  label: string;
  isExpanded?: string | boolean;
  isHidden?: boolean;
  hide?: HideProps;
  questions: FormField[];
  inlineRendering?: 'single-line' | 'multiline' | 'automatic';
  readonly?: string | boolean;
  reference?: FormReference;
}

export interface FormField {
  id: string;
  label?: string;
  type: string; // 'obs' | 'obsGroup' | 'encounterDatetime' | 'encounterLocation' | 'encounterProvider' | 'personAttribute' | 'patientIdentifier' | 'inlineDate'
  questionOptions: FormQuestionOptions;
  datePickerFormat?: 'both' | 'calendar' | 'timer';
  questions?: FormField[];
  value?: any;
  hide?: HideProps;
  isHidden?: boolean;
  isRequired?: boolean;
  required?: string | boolean | RequiredFieldProps;
  unspecified?: boolean;
  isDisabled?: boolean;
  disabled?: boolean | DisableProps;
  readonly?: string | boolean;
  isReadonly?: boolean;
  inlineRendering?: 'single-line' | 'multiline' | 'automatic';
  validators?: FormValidatorConfig[];
  behaviours?: Array<Record<string, any>>;
  questionInfo?: string;
  historicalExpression?: string;
  constrainMaxWidth?: boolean;
  hideSteppers?: boolean;
  meta?: QuestionMetaProps;
}

export interface HideProps {
  hideWhenExpression?: string;
  [key: string]: any;
}

export interface DisableProps {
  disableWhenExpression?: string;
  isDisabled?: boolean;
}

export interface RequiredFieldProps {
  type: string;
  message?: string;
  referenceQuestionId?: string;
  referenceQuestionAnswers?: string[];
}

export interface FormValidatorConfig {
  type: string; // 'js_expression' | 'conditionalAnswered' | 'date' | 'min' | 'max'
  message?: string;
  failsWhenExpression?: string;
  referenceQuestionId?: string;
  referenceQuestionAnswers?: string[];
  [key: string]: any;
}

export interface QuestionMetaProps {
  concept?: string | Record<string, any>;
  initialValue?: {
    refinedValue?: any;
    omrsObject?: any;
  };
  previousValue?: any;
  groupId?: string;
  pageId?: string;
  targetField?: string;
  readonlyExpression?: string;
  [key: string]: any;
}

export interface FormQuestionOptions {
  rendering: RenderType;
  concept?: string;
  conceptMappings?: Array<{ relationship: string; type: string; value: string }>;
  max?: string | number;
  min?: string | number;
  step?: number;
  isTransient?: boolean;
  maxLength?: string | number;
  minLength?: string | number;
  showDate?: string | boolean;
  shownDateOptions?: {
    validators?: FormValidatorConfig[];
    hide?: HideProps;
  };
  showComment?: boolean;
  comment?: string;
  shownCommentOptions?: {
    validators?: FormValidatorConfig[];
    hide?: HideProps;
  };
  answers?: QuestionAnswerOption[];
  weeksList?: string;
  locationTag?: string;
  disallowDecimals?: boolean;
  rows?: number;
  toggleOptions?: { labelTrue: string; labelFalse: string };
  repeatOptions?: RepeatOptions;
  defaultValue?: any;
  calculate?: {
    calculateExpression: string;
  };
  isDateTime?: { labelTrue: boolean; labelFalse: boolean };
  enablePreviousValue?: boolean;
  allowedFileTypes?: string[];
  allowMultiple?: boolean;
  datasource?: { name: string; config?: Record<string, any> };
  isSearchable?: boolean;
  isCheckboxSearchable?: boolean;
  workspaceName?: string;
  workspaceProps?: Record<string, any>;
  buttonLabel?: string;
  identifierType?: string;
  attributeType?: string;
  orderSettingUuid?: string;
  orderType?: string;
  orientation?: 'vertical' | 'horizontal';
  diagnosis?: {
    rank?: number;
    isConfirmed?: boolean;
    conceptClasses?: string[];
    conceptSet?: string;
  };
}

export interface QuestionAnswerOption {
  label: string;
  concept?: string;
  value?: any;
  uuid?: string;
  hide?: HideProps;
  disable?: DisableProps;
  isHidden?: boolean;
  isDisabled?: boolean;
  [key: string]: any;
}

export type RenderType =
  | 'checkbox'
  | 'checkbox-searchable'
  | 'multiCheckbox'
  | 'multi-select'
  | 'content-switcher'
  | 'date'
  | 'datetime'
  | 'drug'
  | 'encounter-location'
  | 'encounter-provider'
  | 'encounter-role'
  | 'fixed-value'
  | 'file'
  | 'group'
  | 'number'
  | 'numeric'
  | 'problem'
  | 'radio'
  | 'repeating'
  | 'select'
  | 'text'
  | 'textarea'
  | 'toggle'
  | 'ui-select-extended'
  | 'workspace-launcher'
  | 'markdown'
  | 'extension-widget'
  | 'select-concept-answers';

export interface RepeatOptions {
  addText?: string;
  limit?: string | number;
  limitExpression?: string;
}

export interface FormReference {
  form: string;
  page: string;
  section: string;
  excludeQuestions?: string[];
}

export interface ReferencedForm {
  formName: string;
  alias: string;
}

export type SessionMode = 'enter' | 'edit' | 'view' | 'embedded-view';

export interface PatientContext {
  id?: string;
  uuid?: string;
  patientNumber?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  sex?: string;
  age?: number;
  birthDate?: string;
  phone?: string;
  address?: string;
  artNumber?: string;
  hospitalNumber?: string;
  [key: string]: any;
}
