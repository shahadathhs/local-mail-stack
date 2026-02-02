import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMailDto {
  @ApiProperty({
    example: 'recipient@local.stack',
    description: 'Recipient email address',
  })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    example: 'Hello from Local Mail Stack',
    description: 'Email subject',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    example: 'This is a test message.',
    description: 'Email body text',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    example: '<p>This is a test message.</p>',
    description: 'Email HTML body',
    required: false,
  })
  @IsOptional()
  @IsString()
  html?: string;
}
