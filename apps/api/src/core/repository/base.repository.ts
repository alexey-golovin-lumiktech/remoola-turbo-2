import { ObjectLiteral, Repository } from 'typeorm';
import { DeepPartial } from 'typeorm/common/DeepPartial';

export abstract class BaseRepository<T extends ObjectLiteral> extends Repository<T> {
  async createAndSave(entity: DeepPartial<T>): Promise<T> {
    const newEntity = this.create(entity);
    return await this.save(newEntity);
  }
}
