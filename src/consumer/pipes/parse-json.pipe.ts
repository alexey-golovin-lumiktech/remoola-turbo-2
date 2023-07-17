import { Injectable, PipeTransform } from '@nestjs/common'

@Injectable()
export class ParseJsonPipe implements PipeTransform {
  transform(value?: any) {
    return value && typeof value == `string` ? JSON.parse(value) : value
  }
}
