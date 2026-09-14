import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class TicketTypeInputDto {
  @IsString()
  @MinLength(1)
  ticketTypeId: string;   // Εσωτερικός κωδικός

  @IsString()
  @MinLength(1)
  name: string;           // Όνομα

  @IsNumber()
  @Min(0)
  price: number;          // Τιμή

  @IsInt()
  @Min(1)
  quantity: number;       // Διαθέσιμα εισιτήρια
}

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  eventType: string;

  @IsString()
  @MinLength(1)
  venue: string;

  @IsString()
  @MinLength(1)
  address: string;

  @IsString()
  @MinLength(1)
  city: string;

  @IsString()
  @MinLength(1)
  country: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsDateString()
  startDateTime: string;

  @IsDateString()
  endDateTime: string;

  @IsInt()
  @Min(1)
  capacity: number;       // Συνολική χωρητικότητα

  @IsString()
  @MinLength(1)
  description: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(80, { each: true })
  categories: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TicketTypeInputDto)
  ticketTypes: TicketTypeInputDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}
