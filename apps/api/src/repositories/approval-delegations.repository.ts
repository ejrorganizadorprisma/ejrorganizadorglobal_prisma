import { db } from '../config/database';
import type { ApprovalDelegation } from '@ejr/shared-types';

function generateId(): string {
  return `del-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export class ApprovalDelegationsRepository {
  async findAll(): Promise<ApprovalDelegation[]> {
    const result = await db.query(
      `SELECT d.*,
        ub.name as delegated_by_name, ub.email as delegated_by_email,
        ut.name as delegated_to_name, ut.email as delegated_to_email
      FROM approval_delegations d
      LEFT JOIN users ub ON ub.id = d.delegated_by
      LEFT JOIN users ut ON ut.id = d.delegated_to
      ORDER BY d.created_at DESC`
    );

    return result.rows.map((row: any) => this.mapToDelegation(row));
  }

  async getActiveDelegates(): Promise<ApprovalDelegation[]> {
    const result = await db.query(
      `SELECT d.*,
        ub.name as delegated_by_name, ub.email as delegated_by_email,
        ut.name as delegated_to_name, ut.email as delegated_to_email
      FROM approval_delegations d
      LEFT JOIN users ub ON ub.id = d.delegated_by
      LEFT JOIN users ut ON ut.id = d.delegated_to
      WHERE d.is_active = true
        AND CURRENT_DATE >= d.start_date
        AND CURRENT_DATE <= d.end_date`
    );

    return result.rows.map((row: any) => this.mapToDelegation(row));
  }

  async isActiveDelegateFor(userId: string): Promise<boolean> {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM approval_delegations
       WHERE delegated_to = $1
         AND is_active = true
         AND CURRENT_DATE >= start_date
         AND CURRENT_DATE <= end_date`,
      [userId]
    );
    return parseInt(result.rows[0].count) > 0;
  }

  async create(data: {
    delegatedBy: string;
    delegatedTo: string;
    startDate: string;
    endDate: string;
  }): Promise<ApprovalDelegation> {
    const id = generateId();

    await db.query(
      `INSERT INTO approval_delegations (
        id, delegated_by, delegated_to, start_date, end_date, is_active
      ) VALUES ($1, $2, $3, $4, $5, true)`,
      [id, data.delegatedBy, data.delegatedTo, data.startDate, data.endDate]
    );

    const result = await db.query(
      `SELECT d.*,
        ub.name as delegated_by_name, ub.email as delegated_by_email,
        ut.name as delegated_to_name, ut.email as delegated_to_email
      FROM approval_delegations d
      LEFT JOIN users ub ON ub.id = d.delegated_by
      LEFT JOIN users ut ON ut.id = d.delegated_to
      WHERE d.id = $1`,
      [id]
    );

    return this.mapToDelegation(result.rows[0]);
  }

  async revoke(id: string): Promise<{ success: boolean }> {
    await db.query(
      `UPDATE approval_delegations
       SET is_active = false, revoked_at = NOW()
       WHERE id = $1`,
      [id]
    );
    return { success: true };
  }

  async findById(id: string): Promise<ApprovalDelegation | null> {
    const result = await db.query(
      `SELECT d.*,
        ub.name as delegated_by_name, ub.email as delegated_by_email,
        ut.name as delegated_to_name, ut.email as delegated_to_email
      FROM approval_delegations d
      LEFT JOIN users ub ON ub.id = d.delegated_by
      LEFT JOIN users ut ON ut.id = d.delegated_to
      WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;
    return this.mapToDelegation(result.rows[0]);
  }

  private mapToDelegation(data: any): ApprovalDelegation {
    return {
      id: data.id,
      delegatedBy: data.delegated_by,
      delegatedByUser: data.delegated_by_name ? { name: data.delegated_by_name, email: data.delegated_by_email } : undefined,
      delegatedTo: data.delegated_to,
      delegatedToUser: data.delegated_to_name ? { name: data.delegated_to_name, email: data.delegated_to_email } : undefined,
      startDate: data.start_date,
      endDate: data.end_date,
      isActive: data.is_active,
      revokedAt: data.revoked_at,
      createdAt: data.created_at,
    };
  }
}
