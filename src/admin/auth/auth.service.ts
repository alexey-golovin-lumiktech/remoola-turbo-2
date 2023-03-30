import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { UsersService } from 'src/admin/entities/users/users.service'
import { IAccessToken, ILoginBody } from 'src/dtos'
import { JwtService } from '@nestjs/jwt'
import { IUserModel } from 'src/models'
import { constants } from '../../constants'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class AuthService {
  constructor(@Inject(UsersService) private readonly usersService: UsersService, private readonly jwtService: JwtService) {}

  private generateToken(admin: IUserModel): string {
    const payload = { email: admin.email, id: admin.id }
    return this.jwtService.sign(payload)
  }

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 5)
  }

  async login(body: ILoginBody): Promise<IAccessToken> {
    try {
      const user = await this.usersService.findByEmail(body.email)
      if (!user) throw new NotFoundException({ message: constants.ADMIN_NOT_FOUND })

      const passwordEquals = await bcrypt.compare(body.password, user.password)

      if (!passwordEquals) {
        throw new BadRequestException({ message: constants.INVALID_PASSWORD })
      }

      const accessToken = this.generateToken(user)

      return { accessToken }
    } catch (error) {
      throw new HttpException(error.message || `Internal error`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
