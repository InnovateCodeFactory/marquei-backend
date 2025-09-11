import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BusinessRatingService } from './business-rating.service';
import { CreateBusinessRatingDto } from './dto/create-business-rating.dto';
import { UpdateBusinessRatingDto } from './dto/update-business-rating.dto';

@Controller('business-rating')
export class BusinessRatingController {
  constructor(private readonly businessRatingService: BusinessRatingService) {}

  @Post()
  create(@Body() createBusinessRatingDto: CreateBusinessRatingDto) {
    return this.businessRatingService.create(createBusinessRatingDto);
  }

  @Get()
  findAll() {
    return this.businessRatingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessRatingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBusinessRatingDto: UpdateBusinessRatingDto) {
    return this.businessRatingService.update(+id, updateBusinessRatingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.businessRatingService.remove(+id);
  }
}
