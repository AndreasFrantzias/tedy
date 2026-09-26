import { IsString, MinLength } from 'class-validator';

export class BroadcastMessageDto {
  //subject of broadcast message
  @IsString()
  @MinLength(1)
  subject: string;

  //body of broadcast message
  @IsString()
  @MinLength(1)
  body: string;
}
