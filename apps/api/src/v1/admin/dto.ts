import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export const SearchResultType = {
  CLIENT: `client`,
  ADMIN: `admin`,
} as const;
export const SearchResultTypes = Object.values(SearchResultType);
export type ISearchResultType = (typeof SearchResultType)[keyof typeof SearchResultType];

export class SearchResult {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  type: ISearchResultType;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  href: string;
}

export type IDatasourceQuerySearchResult = Omit<SearchResult, `type` | `href`>;
