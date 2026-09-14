import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // Απλή μέθοδος που επιστρέφει ένα μήνυμα για το hello endpoint
  getHello(): string {
    return 'Hello World!';
  }
}
