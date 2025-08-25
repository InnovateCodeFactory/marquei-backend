import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { UploadProfilePictureUseCase } from './use-cases';

@Module({
  controllers: [ProfileController],
  providers: [UploadProfilePictureUseCase],
})
export class ProfileModule {}
