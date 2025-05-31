import { TypedConfigService } from '@app/shared/services';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

export const swagger = (app: INestApplication) => {
  const configService = app.get(TypedConfigService);
  const isProduction = configService.getOrThrow('NODE_ENV') === 'production';

  const config = new DocumentBuilder()
    .setTitle(isProduction ? 'Marquei' : 'Marquei Sandbox')
    .setDescription(
      isProduction
        ? 'API para o sistema Marquei'
        : 'API sandbox para o sistema Marquei',
    )
    .setVersion('1.0')
    .build();

  const content = SwaggerModule.createDocument(app, config);

  app.use(
    '/reference',
    apiReference({
      spec: {
        content,
      },
      layout: 'modern',
      theme: 'bluePlanet',
      darkMode: true,
      withFastify: true,
      hideDownloadButton: true,
      hideModels: true,
    }),
  );
};
