import { db } from '../config/database';
import type {
  SystemSettings,
  UpdateSystemSettingsDTO,
  Country,
  Currency,
  Language,
} from '@ejr/shared-types';

export class SystemSettingsRepository {
  /**
   * Buscar as configurações do sistema (sempre retorna a primeira/única linha)
   */
  async get(): Promise<SystemSettings | null> {
    const result = await db.query<any>(
      'SELECT * FROM system_settings LIMIT 1'
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToSystemSettings(result.rows[0]);
  }

  /**
   * Atualizar as configurações do sistema
   */
  async update(dto: UpdateSystemSettingsDTO): Promise<SystemSettings> {
    // Primeiro, buscar o ID das configurações existentes
    const existing = await this.get();

    if (!existing) {
      // Se não existir, criar um novo registro
      const result = await db.query<any>(
        `INSERT INTO system_settings (
          country,
          default_currency,
          language,
          exchange_rate_brl_to_usd,
          exchange_rate_brl_to_pyg,
          exchange_rate_usd_to_pyg,
          enabled_currencies
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          dto.country || 'BR',
          dto.defaultCurrency || 'BRL',
          dto.language || 'pt-BR',
          dto.exchangeRateBrlToUsd || 0.20,
          dto.exchangeRateBrlToPyg || 1450.00,
          dto.exchangeRateUsdToPyg || 7250.00,
          dto.enabledCurrencies || ['BRL', 'PYG', 'USD'],
        ]
      );

      return this.mapToSystemSettings(result.rows[0]);
    }

    // Atualizar o registro existente
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.country !== undefined) {
      updateFields.push(`country = $${paramIndex}`);
      values.push(dto.country);
      paramIndex++;
    }

    if (dto.defaultCurrency !== undefined) {
      updateFields.push(`default_currency = $${paramIndex}`);
      values.push(dto.defaultCurrency);
      paramIndex++;
    }

    if (dto.language !== undefined) {
      updateFields.push(`language = $${paramIndex}`);
      values.push(dto.language);
      paramIndex++;
    }

    if (dto.exchangeRateBrlToUsd !== undefined) {
      updateFields.push(`exchange_rate_brl_to_usd = $${paramIndex}`);
      values.push(dto.exchangeRateBrlToUsd);
      paramIndex++;
    }

    if (dto.exchangeRateBrlToPyg !== undefined) {
      updateFields.push(`exchange_rate_brl_to_pyg = $${paramIndex}`);
      values.push(dto.exchangeRateBrlToPyg);
      paramIndex++;
    }

    if (dto.exchangeRateUsdToPyg !== undefined) {
      updateFields.push(`exchange_rate_usd_to_pyg = $${paramIndex}`);
      values.push(dto.exchangeRateUsdToPyg);
      paramIndex++;
    }

    if (dto.enabledCurrencies !== undefined) {
      updateFields.push(`enabled_currencies = $${paramIndex}`);
      values.push(dto.enabledCurrencies);
      paramIndex++;
    }

    if (dto.mobileAppEnabled !== undefined) {
      updateFields.push(`mobile_app_enabled = $${paramIndex}`);
      values.push(dto.mobileAppEnabled);
      paramIndex++;
    }

    if (dto.mobileAppApiKey !== undefined) {
      updateFields.push(`mobile_app_api_key = $${paramIndex}`);
      values.push(dto.mobileAppApiKey);
      paramIndex++;
    }

    // Adicionar updated_at
    updateFields.push(`updated_at = NOW()`);

    // Adicionar o ID do registro existente
    values.push(existing.id);

    const result = await db.query<any>(
      `UPDATE system_settings
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return this.mapToSystemSettings(result.rows[0]);
  }

  /**
   * Obter ou criar configurações padrão
   */
  async getOrCreate(): Promise<SystemSettings> {
    const existing = await this.get();

    if (existing) {
      return existing;
    }

    // Criar configurações padrão
    return this.update({
      country: 'BR',
      defaultCurrency: 'BRL',
      language: 'pt-BR',
      exchangeRateBrlToUsd: 0.20,
      exchangeRateBrlToPyg: 1450.00,
      exchangeRateUsdToPyg: 7250.00,
      enabledCurrencies: ['BRL', 'PYG', 'USD'],
    });
  }

  /**
   * Mapear dados do banco para o modelo SystemSettings
   */
  private mapToSystemSettings(data: any): SystemSettings {
    return {
      id: data.id,
      country: data.country as Country,
      defaultCurrency: data.default_currency as Currency,
      language: data.language as Language,
      exchangeRateBrlToUsd: parseFloat(data.exchange_rate_brl_to_usd),
      exchangeRateBrlToPyg: parseFloat(data.exchange_rate_brl_to_pyg),
      exchangeRateUsdToPyg: parseFloat(data.exchange_rate_usd_to_pyg),
      enabledCurrencies: data.enabled_currencies as Currency[],
      mobileAppEnabled: data.mobile_app_enabled ?? false,
      mobileAppApiKey: data.mobile_app_api_key ?? null,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
