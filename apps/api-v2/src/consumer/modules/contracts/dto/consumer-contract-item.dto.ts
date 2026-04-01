import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ConsumerContractItem {
  @Expose()
  @ApiProperty({ example: `35f4d4b2-0bb8-4c74-95b4-e5b8f186e284` })
  id: string;

  @Expose()
  @ApiProperty({ example: `John Doe` })
  name: string;

  @Expose()
  @ApiProperty({ example: `john.doe@example.com` })
  email: string;

  @Expose()
  @ApiProperty({ example: `35f4d4b2-0bb8-4c74-95b4-e5b8f186e284`, nullable: true })
  lastRequestId: string | null;

  @Expose()
  @ApiProperty({ example: `COMPLETED`, nullable: true })
  lastStatus: string | null;

  @Expose()
  @ApiProperty({ example: `2025-01-17T10:33:21.000Z`, nullable: true })
  lastActivity: Date | null;

  @Expose()
  @ApiProperty({ example: 4 })
  docs: number;
}
