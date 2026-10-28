import { getStoredServerUrl } from './config';
import { AuthUser, LoginResponse } from '../types/auth';

/**
 * Đăng nhập tài khoản qua API CAISHOP
 */
export async function apiLogin(identifier: string, password: string): Promise<LoginResponse> {
  const baseUrl = await getStoredServerUrl();
  
  // Thử kết nối với URL đã lưu
  const attemptLogin = async (url: string, timeoutMs: number = 6000): Promise<LoginResponse> => {
    const endpoint = `${url}/api/auth/login`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
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
      clearTimeout(timeoutId);
      throw error;
    }
  };

  try {
    return await attemptLogin(baseUrl, 5000);
  } catch (error: any) {
    // Nếu kết nối URL ban đầu thất bại và URL đó không phải localhost, thử fallback qua localhost:3000 (dành cho kết nối cáp USB adb reverse)
    if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      try {
        const fallbackRes = await attemptLogin('http://localhost:3000', 4000);
        return fallbackRes;
      } catch {
        // Fallback cũng thất bại, trả về lỗi ban đầu
      }
    }

    if (error.name === 'AbortError') {
      return {
        success: false,
        message: `Hết thời gian kết nối tới máy chủ (${baseUrl}). Hãy đảm bảo backend đang chạy hoặc kiểm tra cài đặt IP trong biểu tượng ⚙️.`,
      };
    }
    return {
      success: false,
      message: `Không thể kết nối tới máy chủ (${baseUrl}). Vui lòng kiểm tra lại mạng hoặc kết nối cáp USB.`,
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
