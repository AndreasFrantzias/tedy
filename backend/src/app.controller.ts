import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Η βασική σελίδα του API, επιστρέφει ένα απλό μήνυμα
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
