import { Controller, Get, Header } from '@nestjs/common';
import { ExportService } from './export.service';
import { Roles } from '../auth/roles.decorator';

@Controller('export')
@Roles('admin')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('events.xml')
  //set the content type('Content-Type') of the response to XML ('application/xml')
  @Header('Content-Type', 'application/xml')
  toXml() {
    return this.exportService.toXml();
  }

  @Get('events.json')
  //no header needed as it defaults to 'application/json' 
  toJson() {
    return this.exportService.toJson();
  }
}
