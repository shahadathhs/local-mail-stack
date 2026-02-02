import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MailboxQueryDto {
  @ApiProperty({
    description: 'The folder/mailbox to view',
    default: 'INBOX',
    required: false,
  })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiProperty({ description: 'Search query for emails', required: false })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({
    description: 'Signed URL signature (for non-JWT access)',
    required: false,
  })
  @IsOptional()
  @IsString()
  sig?: string;
}
