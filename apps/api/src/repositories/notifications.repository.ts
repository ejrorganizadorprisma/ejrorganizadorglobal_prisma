import { supabase } from '../config/supabase';

export class NotificationsRepository {
  async findByUserId(userId: string, limit: number = 10) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Erro ao buscar notificações: ${error.message}`);

    return (data || []).map(this.mapNotification);
  }

  async markAsRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw new Error(`Erro ao marcar como lida: ${error.message}`);

    return { success: true };
  }

  async create(notification: { userId: string; type: string; title: string; message: string }) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar notificação: ${error.message}`);

    return this.mapNotification(data);
  }

  async countUnread(userId: string) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw new Error(`Erro ao contar não lidas: ${error.message}`);

    return count || 0;
  }

  private mapNotification(data: any) {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      isRead: data.is_read,
      createdAt: new Date(data.created_at),
    };
  }
}
