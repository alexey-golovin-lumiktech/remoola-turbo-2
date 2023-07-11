import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import { validate, version } from 'uuid'

@Injectable()
export class ParseUuidV4Pipe implements PipeTransform {
  private readonly version: string = `4`

  transform(value: any) {
    const isValid = validate(value) && version(value) == Number(this.version)
    if (!isValid) throw new BadRequestException(`Validation failed (uuid v${this.version} is expected)`)

    return value
  }
}
