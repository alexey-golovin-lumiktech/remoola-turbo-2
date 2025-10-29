import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { IUserRole, UserRole } from '../../../common';
import { IDatasourceQuerySearchResult, ISearchResultType, SearchResult, SearchResultType } from '../dto';

@Injectable()
export class GlobalSearchService {
  constructor(@InjectDataSource() private readonly datasource: DataSource) {}

  async search(search: string) {
    const like = `${search.toLowerCase()}%`;

    const roles = [
      [UserRole.ADMIN, SearchResultType.ADMIN],
      [UserRole.CLIENT, SearchResultType.CLIENT],
    ];

    const users = await Promise.all(roles.map(([role, type]) => this.searchUsersByRole(role, type, like)));

    return { results: [...users.flat()] };
  }

  private async searchUsersByRole(role: IUserRole, type: ISearchResultType, like: string) {
    const rows = await this.datasource.query<IDatasourceQuerySearchResult[]>(
      ` SELECT id
            , name
        FROM public.user
        WHERE role = $1
          AND (
            LOWER(name) ILIKE $2
            OR
            LOWER(email) ILIKE $2
          )
        LIMIT 5`,
      [role, like],
    );

    return rows.map(this.compile(type));
  }

  private compile(type: ISearchResultType) {
    const searchTypePrefix = {
      [SearchResultType.ADMIN]: `admins`,
      [SearchResultType.CLIENT]: `clients`,
    };

    const prefix = searchTypePrefix[type];

    return ({ id, name }: IDatasourceQuerySearchResult) => {
      const href = `/${prefix}/${id}`;

      return { id, name, type, href } satisfies SearchResult;
    };
  }
}
