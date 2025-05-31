import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvSchemaType } from '../environment';

@Injectable()
export class TypedConfigService extends ConfigService<EnvSchemaType> {}
