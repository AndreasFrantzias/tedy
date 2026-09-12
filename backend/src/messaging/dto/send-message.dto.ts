import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsInt()
  recipientId: number;

  @IsOptional()
  @IsInt()
  eventId?: number;

  @IsString()
  @MinLength(1)
  subject: string;

  @IsString()
  @MinLength(1)
  body: string;
}
