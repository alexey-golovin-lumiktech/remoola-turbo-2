import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import { validate, version } from 'uuid'

@Injectable()
export class ParseArrayOfUuidV4Pipe implements PipeTransform {
  private readonly version: string = `4`

  transform(values: any[]) {
    const isValidIds = values.every(value => validate(value) && version(value) == Number(this.version))
    if (!isValidIds) throw new BadRequestException(`Validation failed (uuid v${this.version} is expected)`)

    return values
  }
}
