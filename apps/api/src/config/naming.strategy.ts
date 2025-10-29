import { DefaultNamingStrategy as NamingStrategy, NamingStrategyInterface as INamingStrategy } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils';

export class SnakeNamingStrategy extends NamingStrategy implements INamingStrategy {
  tableName(className: string, custom?: string) {
    return custom ?? snakeCase(className);
  }

  columnName(propertyName: string, custom?: string, embeddedPrefixes: string[] = []) {
    return snakeCase(embeddedPrefixes.join(`_`)) + (custom ?? snakeCase(propertyName));
  }

  relationName(propertyName: string) {
    return snakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string) {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableName(firstTable: string, secondTable: string, firstProp: string) {
    return snakeCase(`${firstTable}_${firstProp.replace(/\./g, `_`)}_${secondTable}`);
  }

  joinTableColumnName(table: string, propertyName: string, columnName?: string) {
    return snakeCase(`${table}_${columnName ?? propertyName}`);
  }
}
