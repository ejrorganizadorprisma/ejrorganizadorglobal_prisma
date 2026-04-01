import { db } from '../config/database';
import type { DocumentSettings, CreateDocumentSettingsDTO, UpdateDocumentSettingsDTO } from '@ejr/shared-types';

export class DocumentSettingsRepository {
  async findAll() {
    const query = `
      SELECT *
      FROM document_settings
      ORDER BY is_default DESC, profile_name ASC
    `;

    const result = await db.query(query);

    return result.rows.map(this.mapToDocumentSettings);
  }

  async findById(id: string) {
    const query = `
      SELECT *
      FROM document_settings
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToDocumentSettings(result.rows[0]);
  }

  async findDefault() {
    const query = `
      SELECT *
      FROM document_settings
      WHERE is_default = true
      LIMIT 1
    `;

    const result = await db.query(query);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToDocumentSettings(result.rows[0]);
  }

  async create(settingsData: CreateDocumentSettingsDTO) {
    const id = `doc-set-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const query = `
      INSERT INTO document_settings (
        id, profile_name, is_default, company_logo, company_name,
        footer_text, footer_address, footer_phone, footer_email, footer_website,
        signature_image, signature_name, signature_role, default_quote_validity_days,
        primary_color, secondary_color, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      settingsData.profileName,
      settingsData.isDefault ?? false,
      settingsData.companyLogo,
      settingsData.companyName,
      settingsData.footerText,
      settingsData.footerAddress,
      settingsData.footerPhone,
      settingsData.footerEmail,
      settingsData.footerWebsite,
      settingsData.signatureImage,
      settingsData.signatureName,
      settingsData.signatureRole,
      settingsData.defaultQuoteValidityDays,
      settingsData.primaryColor,
      settingsData.secondaryColor,
      settingsData.createdBy,
    ]);

    return this.mapToDocumentSettings(result.rows[0]);
  }

  async update(id: string, settingsData: UpdateDocumentSettingsDTO) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (settingsData.profileName !== undefined) {
      fields.push(`profile_name = $${paramIndex}`);
      values.push(settingsData.profileName);
      paramIndex++;
    }
    if (settingsData.isDefault !== undefined) {
      fields.push(`is_default = $${paramIndex}`);
      values.push(settingsData.isDefault);
      paramIndex++;
    }
    if (settingsData.companyLogo !== undefined) {
      fields.push(`company_logo = $${paramIndex}`);
      values.push(settingsData.companyLogo);
      paramIndex++;
    }
    if (settingsData.companyName !== undefined) {
      fields.push(`company_name = $${paramIndex}`);
      values.push(settingsData.companyName);
      paramIndex++;
    }
    if (settingsData.footerText !== undefined) {
      fields.push(`footer_text = $${paramIndex}`);
      values.push(settingsData.footerText);
      paramIndex++;
    }
    if (settingsData.footerAddress !== undefined) {
      fields.push(`footer_address = $${paramIndex}`);
      values.push(settingsData.footerAddress);
      paramIndex++;
    }
    if (settingsData.footerPhone !== undefined) {
      fields.push(`footer_phone = $${paramIndex}`);
      values.push(settingsData.footerPhone);
      paramIndex++;
    }
    if (settingsData.footerEmail !== undefined) {
      fields.push(`footer_email = $${paramIndex}`);
      values.push(settingsData.footerEmail);
      paramIndex++;
    }
    if (settingsData.footerWebsite !== undefined) {
      fields.push(`footer_website = $${paramIndex}`);
      values.push(settingsData.footerWebsite);
      paramIndex++;
    }
    if (settingsData.signatureImage !== undefined) {
      fields.push(`signature_image = $${paramIndex}`);
      values.push(settingsData.signatureImage);
      paramIndex++;
    }
    if (settingsData.signatureName !== undefined) {
      fields.push(`signature_name = $${paramIndex}`);
      values.push(settingsData.signatureName);
      paramIndex++;
    }
    if (settingsData.signatureRole !== undefined) {
      fields.push(`signature_role = $${paramIndex}`);
      values.push(settingsData.signatureRole);
      paramIndex++;
    }
    if (settingsData.defaultQuoteValidityDays !== undefined) {
      fields.push(`default_quote_validity_days = $${paramIndex}`);
      values.push(settingsData.defaultQuoteValidityDays);
      paramIndex++;
    }
    if (settingsData.primaryColor !== undefined) {
      fields.push(`primary_color = $${paramIndex}`);
      values.push(settingsData.primaryColor);
      paramIndex++;
    }
    if (settingsData.secondaryColor !== undefined) {
      fields.push(`secondary_color = $${paramIndex}`);
      values.push(settingsData.secondaryColor);
      paramIndex++;
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE document_settings
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    return this.mapToDocumentSettings(result.rows[0]);
  }

  async delete(id: string) {
    const query = `
      DELETE FROM document_settings
      WHERE id = $1
    `;

    await db.query(query, [id]);

    return { success: true };
  }

  private mapToDocumentSettings(data: any): DocumentSettings {
    return {
      id: data.id,
      profileName: data.profile_name,
      isDefault: data.is_default,
      companyLogo: data.company_logo,
      companyName: data.company_name,
      footerText: data.footer_text,
      footerAddress: data.footer_address,
      footerPhone: data.footer_phone,
      footerEmail: data.footer_email,
      footerWebsite: data.footer_website,
      signatureImage: data.signature_image,
      signatureName: data.signature_name,
      signatureRole: data.signature_role,
      defaultQuoteValidityDays: data.default_quote_validity_days,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by,
    };
  }
}
