import { DocumentSettingsRepository } from '../repositories/document-settings.repository';
import { CreateDocumentSettingsSchema, UpdateDocumentSettingsSchema } from '@ejr/shared-types';
import type { CreateDocumentSettingsDTO, UpdateDocumentSettingsDTO } from '@ejr/shared-types';

export class DocumentSettingsService {
  private repository: DocumentSettingsRepository;

  constructor() {
    this.repository = new DocumentSettingsRepository();
  }

  async getAllSettings() {
    return await this.repository.findAll();
  }

  async getSettingsById(id: string) {
    const settings = await this.repository.findById(id);
    if (!settings) {
      throw new Error('Configuração de documentos não encontrada');
    }
    return settings;
  }

  async getDefaultSettings() {
    const settings = await this.repository.findDefault();
    if (!settings) {
      throw new Error('Nenhuma configuração padrão encontrada. Configure ao menos um perfil padrão.');
    }
    return settings;
  }

  async createSettings(data: CreateDocumentSettingsDTO, userId?: string) {
    // Validate input
    const validatedData = CreateDocumentSettingsSchema.parse(data);

    // Add creator info
    const settingsData = {
      ...validatedData,
      createdBy: userId,
    };

    return await this.repository.create(settingsData);
  }

  async updateSettings(id: string, data: UpdateDocumentSettingsDTO) {
    // Validate input
    const validatedData = UpdateDocumentSettingsSchema.parse(data);

    // Check if settings exists
    await this.getSettingsById(id);

    return await this.repository.update(id, validatedData);
  }

  async deleteSettings(id: string) {
    // Check if settings exists
    const settings = await this.getSettingsById(id);

    // Prevent deletion of default settings without warning
    if (settings.isDefault) {
      throw new Error('Não é possível deletar a configuração padrão. Defina outra como padrão primeiro.');
    }

    return await this.repository.delete(id);
  }

  async setAsDefault(id: string) {
    // Check if settings exists
    await this.getSettingsById(id);

    // Update to set as default (trigger will unset others)
    return await this.repository.update(id, { isDefault: true });
  }
}
