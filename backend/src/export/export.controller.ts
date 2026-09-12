import { Controller, Get, Header } from '@nestjs/common';
import { ExportService } from './export.service';
import { Roles } from '../auth/roles.decorator';

@Controller('export')
@Roles('admin')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('events.xml')
  @Header('Content-Type', 'application/xml')
  toXml() {
    return this.exportService.toXml();
  }

  @Get('events.json')
  toJson() {
    return this.exportService.toJson();
  }
}
