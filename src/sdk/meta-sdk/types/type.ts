export type FieldType = 'string' | 'integer' | 'number' | 'boolean' | 'list' | 'dict' | 'object';

export interface FieldDefinition {
  type: FieldType;
  required?: boolean;
  indexed?: boolean;
  default?: unknown;
  /** list 元素类型定义（可嵌套复合类型） */
  items?: FieldDefinition;
  /** dict 值类型定义（可嵌套复合类型） */
  values?: FieldDefinition;
  /** object 子字段定义（递归结构） */
  fields?: Record<string, FieldDefinition>;
}

export interface SchemaDefinition {
  fields: Record<string, FieldDefinition>;
}

export interface MetadataType {
  id: number;
  typeName: string;
  serviceName: string;
  description: string | null;
  schemaJson: SchemaDefinition;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateTypeParams {
  typeName: string;
  serviceName: string;
  description?: string;
  schemaJson: SchemaDefinition;
}

export interface UpdateTypeParams {
  description?: string;
  schemaJson?: SchemaDefinition;
}
