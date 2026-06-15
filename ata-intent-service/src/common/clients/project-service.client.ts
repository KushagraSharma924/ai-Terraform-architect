import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProjectServiceClient {
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('app.projectServiceUrl')!;
  }

  private getHeaders(userId: string, tier = 'free') {
    return {
      'x-user-id': userId,
      'x-user-role': 'user',
      'x-user-tier': tier,
      'Content-Type': 'application/json',
    };
  }

  async getQuota(userId: string, tier = 'free') {
    try {
      const response = await fetch(`${this.baseUrl}/usage/quota`, {
        method: 'GET',
        headers: this.getHeaders(userId, tier),
      });

      if (!response.ok) {
        throw new Error('Failed to get quota');
      }

      return await response.json();
    } catch (error: any) {
      throw new HttpException(
        `Project service error: ${error?.message || error}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async decrementQuota(userId: string, tier = 'free') {
    try {
      const response = await fetch(`${this.baseUrl}/usage/decrement`, {
        method: 'POST',
        headers: this.getHeaders(userId, tier),
      });

      if (!response.ok) {
        throw new Error('Failed to decrement quota');
      }

      return await response.json();
    } catch (error: any) {
      throw new HttpException(
        `Project service error: ${error?.message || error}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
