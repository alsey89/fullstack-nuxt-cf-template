import { BASE_URL } from "../config";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

export interface TestResponse<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
  headers: Headers;
}

export class TestClient {
  private cookies: Map<string, string> = new Map();

  constructor(private baseUrl: string = BASE_URL) {}

  /**
   * Parse Set-Cookie headers and store cookies
   */
  private parseCookies(response: Response): void {
    const setCookieHeader = response.headers.get("set-cookie");
    if (!setCookieHeader) return;

    // Parse cookies (handle multiple cookies in one header)
    const cookieParts = setCookieHeader.split(/,(?=[^;]+=[^;]+)/);
    for (const part of cookieParts) {
      const [nameValue] = part.split(";");
      if (nameValue) {
        const eqIndex = nameValue.indexOf("=");
        if (eqIndex > 0) {
          const name = nameValue.slice(0, eqIndex).trim();
          const value = nameValue.slice(eqIndex + 1).trim();
          if (name && value) {
            this.cookies.set(name, value);
          }
        }
      }
    }
  }

  /**
   * Build Cookie header from stored cookies
   */
  private getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  private async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<TestResponse<T>> {
    const url = new URL(endpoint, this.baseUrl);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const headers = new Headers(options.headers);
    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      headers.set("Cookie", cookieHeader);
    }
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers,
    });

    // Store any cookies from response
    this.parseCookies(response);

    // Parse response body
    let data: T;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      data = (await response.json()) as T;
    } else {
      data = (await response.text()) as unknown as T;
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: response.headers,
    };
  }

  async get<T = unknown>(endpoint: string, options: RequestOptions = {}) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = unknown>(endpoint: string, options: RequestOptions = {}) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  /**
   * Clear all stored cookies (logout)
   */
  clearCookies() {
    this.cookies.clear();
  }

  /**
   * Check if client has any cookies (likely authenticated)
   */
  hasCookies(): boolean {
    return this.cookies.size > 0;
  }

  /**
   * Set a cookie manually (useful for testing locale, preferences, etc.)
   */
  setCookie(name: string, value: string): void {
    this.cookies.set(name, value);
  }

  /**
   * Get a cookie value
   */
  getCookie(name: string): string | undefined {
    return this.cookies.get(name);
  }
}
