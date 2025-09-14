import { RedisService } from '@app/shared/modules/redis/redis.service';
import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type WhatsAppRequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  data?: any;
  params?: any;
  headers?: Record<string, string>;
};

@Injectable()
export class WhatsAppBaseService {
  private readonly logger = new Logger(WhatsAppBaseService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
  ) {}

  public async makeRequest(options: WhatsAppRequestOptions) {
    try {
      const { method, endpoint, data, params, headers } = options;
      const token = await this.getAccessToken();

      if (!token)
        throw new InternalServerErrorException(
          'Could not get WhatsApp API token',
        );

      const url = `${this.configService.get<string>('WHATSAPP_API_URL')}${endpoint}`;

      const requestHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...headers,
      };

      const response = await this.httpService.axiosRef.request({
        method,
        url,
        data,
        params,
        headers: requestHeaders,
      });

      return response.data;
    } catch (error) {
      this.logger.error(error?.response?.data || error.message);
      throw error;
    }
  }

  private async getAccessToken(): Promise<string> {
    const cachedTokenKey = 'whatsapp_api_token';

    const cachedToken = await this.redisService.get({
      key: cachedTokenKey,
    });

    if (cachedToken) return cachedToken;

    try {
      const response = await this.httpService.axiosRef.post(
        `${this.configService.get<string>('WHATSAPP_API_URL')}/auth/login`,
        {
          email: this.configService.get<string>('WHATSAPP_API_USERNAME'),
          password: this.configService.get<string>('WHATSAPP_API_PASSWORD'),
        },
      );

      const token = response?.data?.data?.token;

      if (!token)
        throw new InternalServerErrorException(
          'Could not get WhatsApp API token',
        );

      await this.redisService.set({
        key: cachedTokenKey,
        value: token,
        ttlInSeconds: 3600,
      });

      return token;
    } catch (error) {
      this.logger.error(error?.response?.data || error.message);
      throw error;
    }
  }
}
