import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import { EditBusinessDto } from '../dto/requests/edit-business.dto';

@Injectable()
export class EditBusinessUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(user: CurrentUser, dto: EditBusinessDto) {
    const businessId = user?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('No business selected');

    const data: Prisma.BusinessUpdateInput = {};
    const validations: Array<Promise<void>> = [];

    if ('name' in dto && typeof dto.name === 'string' && dto.name.trim().length) {
      data.name = dto.name.trim();
    }
    if ('description' in dto) data.description = dto.description ?? null;
    if ('phone' in dto) data.phone = dto.phone ?? null;
    if ('email' in dto) data.email = dto.email ?? null;
    if ('website' in dto) {
      data.website = dto.website ?? null;
      if (typeof dto.website === 'string' && dto.website.trim().length) {
        validations.push(this.validateUrl(dto.website, 'website'));
      }
    }
    if ('instagram' in dto) {
      data.instagram = dto.instagram ?? null;
      if (typeof dto.instagram === 'string' && dto.instagram.trim().length) {
        validations.push(this.validateUrl(dto.instagram, 'instagram'));
      }
    }

    if ('zipCode' in dto) data.zipCode = dto.zipCode ?? null;
    if ('street' in dto) data.street = dto.street ?? null;
    if ('neighbourhood' in dto) data.neighbourhood = dto.neighbourhood ?? null;
    if ('number' in dto) data.number = dto.number ?? null;
    if ('complement' in dto) data.complement = dto.complement ?? null;
    if ('city' in dto) data.city = dto.city ?? null;
    if ('uf' in dto) data.uf = dto.uf ?? null;
    if ('opening_hours' in dto) data.opening_hours = (dto as any).opening_hours ?? null;

    if (Object.keys(data).length === 0) return null;

    if (validations.length) {
      await Promise.all(validations);
    }

    const exists = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Business not found');

    await this.prisma.business.update({ where: { id: businessId }, data, select: { id: true } });

    return null;
  }

  private async validateUrl(url: string, field: 'website' | 'instagram') {
    const parsed = this.normalizeUrl(url);
    if (!parsed) {
      throw new BadRequestException(
        field === 'website' ? 'URL do site inválida' : 'URL do Instagram inválida',
      );
    }

    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'https:') {
      throw new BadRequestException(
        field === 'website'
          ? 'Somente URLs HTTPS são permitidas'
          : 'Somente URLs HTTPS são permitidas para Instagram',
      );
    }

    if (parsed.username || parsed.password) {
      throw new BadRequestException('Credenciais na URL não são permitidas');
    }

    const hostname = parsed.hostname.toLowerCase();
    if (this.isBlockedHost(hostname)) {
      throw new BadRequestException('Host inválido');
    }

    if (field === 'instagram' && !this.isAllowedInstagramHost(hostname)) {
      throw new BadRequestException('URL do Instagram inválida');
    }

    const ok = await this.checkUrlReachable(parsed);
    if (!ok) {
      throw new BadRequestException(
        field === 'website' ? 'Site não encontrado' : 'Instagram não encontrado',
      );
    }
  }

  private normalizeUrl(input: string): URL | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    try {
      return new URL(trimmed);
    } catch {
      try {
        return new URL(`https://${trimmed}`);
      } catch {
        return null;
      }
    }
  }

  private isBlockedHost(hostname: string): boolean {
    if (!hostname) return true;
    if (hostname === 'localhost') return true;
    if (hostname.endsWith('.local')) return true;
    if (hostname.endsWith('.internal')) return true;

    if (this.isIpLiteral(hostname)) {
      return this.isPrivateOrReservedIp(hostname);
    }

    return false;
  }

  private isIpLiteral(hostname: string): boolean {
    return isIP(hostname) !== 0;
  }

  private isPrivateOrReservedIp(ip: string): boolean {
    return this.isPrivateIpV4(ip) || this.isPrivateIpV6(ip);
  }

  private isPrivateIpV4(ip: string): boolean {
    const match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!match) return false;
    const parts = match.slice(1).map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
      return true;
    }
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 192 && b === 0 && parts[2] === 0) return true;
    if (a === 192 && b === 0 && parts[2] === 2) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51 && parts[2] === 100) return true;
    if (a === 203 && b === 0 && parts[2] === 113) return true;
    if (a >= 224) return true;
    return false;
  }

  private isPrivateIpV6(ip: string): boolean {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('fe80:')) return true;
    if (normalized.startsWith('ff')) return true;
    if (normalized.startsWith('2001:db8')) return true;
    if (normalized.startsWith('::ffff:')) {
      const mapped = normalized.replace('::ffff:', '');
      return this.isPrivateIpV4(mapped);
    }
    return false;
  }

  private isAllowedInstagramHost(hostname: string): boolean {
    return (
      hostname === 'instagram.com' ||
      hostname === 'www.instagram.com' ||
      hostname === 'm.instagram.com' ||
      hostname === 'instagr.am'
    );
  }

  private async checkUrlReachable(parsed: URL): Promise<boolean> {
    const port = parsed.port ? Number(parsed.port) : 443;
    if (!Number.isFinite(port) || port !== 443) return false;

    const addresses = await this.resolvePublicAddresses(parsed.hostname);
    if (!addresses.length) return false;

    let status = await this.fetchStatus(parsed, addresses, 'HEAD');
    if (status === 405) {
      status = await this.fetchStatus(parsed, addresses, 'GET');
    }

    return this.isValidStatus(status);
  }

  private async resolvePublicAddresses(hostname: string): Promise<string[]> {
    if (this.isIpLiteral(hostname)) {
      return this.isPrivateOrReservedIp(hostname) ? [] : [hostname];
    }

    try {
      const records = await dnsLookup(hostname, { all: true, verbatim: true });
      const allowed = records
        .map((record) => record.address)
        .filter((address) => !this.isPrivateOrReservedIp(address));
      return Array.from(new Set(allowed));
    } catch {
      return [];
    }
  }

  private async fetchStatus(
    url: URL,
    addresses: string[],
    method: 'HEAD' | 'GET',
  ): Promise<number | null> {
    for (const address of addresses) {
      const status = await this.fetchStatusForAddress(url, address, method);
      if (typeof status === 'number') return status;
    }
    return null;
  }

  private fetchStatusForAddress(
    url: URL,
    address: string,
    method: 'HEAD' | 'GET',
  ): Promise<number | null> {
    const path = `${url.pathname || '/'}${url.search || ''}`;
    return new Promise((resolve) => {
      const req = httpsRequest(
        {
          hostname: url.hostname,
          port: 443,
          path,
          method,
          timeout: 4000,
          servername: url.hostname,
          headers: {
            'User-Agent': 'MarqueiUrlCheck/1.0',
            Accept: '*/*',
          },
          lookup: (_hostname, _options, cb) => {
            cb(null, address, address.includes(':') ? 6 : 4);
          },
        },
        (res) => {
          res.resume();
          if (method === 'GET') res.destroy();
          resolve(res.statusCode ?? null);
        },
      );

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.on('error', () => resolve(null));
      req.end();
    });
  }

  private isValidStatus(status?: number | null): boolean {
    if (!status) return false;
    if (status >= 200 && status < 400) return true;
    if (status === 401 || status === 403) return true;
    return false;
  }
}
