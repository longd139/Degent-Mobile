import { getStoredServerUrl } from './config';
import { AuthUser, LoginResponse } from '../types/auth';

/**
 * Đăng nhập tài khoản qua API CAISHOP
 */
export async function apiLogin(identifier: string, password: string): Promise<LoginResponse> {
  const baseUrl = await getStoredServerUrl();
  const endpoint = `${baseUrl}/api/auth/login`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        identifier: identifier.trim(),
        password,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json();
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: `Hết thời gian kết nối (Timeout). Vui lòng kiểm tra lại địa chỉ máy chủ: ${baseUrl}`,
      };
    }
    return {
      success: false,
      message: `Không thể kết nối tới máy chủ (${baseUrl}). Chi tiết: ${error.message || 'Lỗi mạng'}`,
    };
  }
}

/**
 * Kiểm tra trạng thái phiên làm việc (Session)
 */
export async function apiGetMe(token: string): Promise<{ success: boolean; user?: AuthUser; message?: string }> {
  const baseUrl = await getStoredServerUrl();
  const endpoint = `${baseUrl}/api/auth/me`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return { success: false, message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' };
    }

    return await res.json();
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
