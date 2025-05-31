export class SuccessResponseDto {
  success = true;
  data: unknown = null;
  message: string | null = null;

  constructor(response: {
    data?: unknown;
    statusCode?: number;
    message?: string;
  }) {
    Object.assign(this, response);
  }
}
