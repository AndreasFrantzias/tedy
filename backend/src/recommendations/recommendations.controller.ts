import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsQueryDto } from './dto/recommendations-query.dto';

interface AuthedRequest extends Request {
  user?: { userId: number; username: string; roles: string[] };
}

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get()
  recommend(
    @Req() req: AuthedRequest,
    @Query() query: RecommendationsQueryDto,
  ) {
    return this.recommendationsService.recommend(
      req.user!.userId,
      query.limit ?? 10,
    );
  }
}
