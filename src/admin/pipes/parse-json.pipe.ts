import { Injectable, PipeTransform } from '@nestjs/common'
import JSON5 from 'json5'

@Injectable()
export class ParseJsonPipe implements PipeTransform {
  transform(value?: any) {
    return value && typeof value == `string` ? JSON5.parse(value) : value
  }
}
