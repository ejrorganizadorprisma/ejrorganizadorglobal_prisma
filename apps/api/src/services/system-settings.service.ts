import { SystemSettingsRepository } from '../repositories/system-settings.repository';
import type { SystemSettings, UpdateSystemSettingsDTO } from '@ejr/shared-types';

export class SystemSettingsService {
  private repository: SystemSettingsRepository;

  constructor() {
    this.repository = new SystemSettingsRepository();
  }

  async getSettings(): Promise<SystemSettings> {
    return this.repository.getOrCreate();
  }

  async updateSettings(dto: UpdateSystemSettingsDTO): Promise<SystemSettings> {
    // Validações
    if (dto.exchangeRateBrlToUsd !== undefined && dto.exchangeRateBrlToUsd <= 0) {
      throw new Error('Taxa de câmbio BRL->USD deve ser maior que zero');
    }

    if (dto.exchangeRateBrlToPyg !== undefined && dto.exchangeRateBrlToPyg <= 0) {
      throw new Error('Taxa de câmbio BRL->PYG deve ser maior que zero');
    }

    if (dto.enabledCurrencies !== undefined && dto.enabledCurrencies.length === 0) {
      throw new Error('Pelo menos uma moeda deve estar habilitada');
    }

    return this.repository.update(dto);
  }
}
