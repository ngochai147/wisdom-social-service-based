import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getCookie, setCookie, clearAuthStorage } from "../utils/cookies";
import { API_BASE_URL } from "../config/backend";

const TOKEN_TTL_DAYS = 1/24;
const REFRESH_MARGIN = 5 * 60 * 1000;
const EXPIRES_COOKIE = 'tokenExpiresAt';
const ACCESS_COOKIE  = 'accessToken';

// ─── Retry / Timeout config ─────────────────────────────────────────────────
const DEFAULT_TIMEOUT   = 15_000;   // 15s cho mỗi request
const MAX_RETRIES       = 3;        // Tối đa 3 lần retry
const RETRY_BASE_DELAY  = 1_000;    // Delay cơ bản 1s, exponential backoff
const RETRYABLE_STATUS  = new Set([408, 429, 500, 502, 503, 504]);

interface RetryConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
    _retryCount?: number;
}

const isRetryable = (error: AxiosError): boolean => {
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        return true;
    }
    return !!error.response && RETRYABLE_STATUS.has(error.response.status);
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Instance chính — có interceptor
const axiosClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: DEFAULT_TIMEOUT,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

// Instance riêng để gọi refresh — KHÔNG có interceptor, tránh vòng lặp
const axiosRefresh: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // cần để gửi refreshToken cookie lên backend
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

// ─── Public endpoints ──────────────────────────────────────────────────────────

const PUBLIC_ENDPOINTS = [
    '/auth/login',
    '/auth/register',
    '/auth/confirm',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/refresh',
    '/session/qr-login/create',
    '/session/qr-login/status/:sessionId',
    '/session/qr-login/access-token/:sessionId',
    '/session/qr-login/access-token',
];

const isPublicEndpoint = (url?: string): boolean => {
    if (!url) return false;
    return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

// ─── Cookie helpers ────────────────────────────────────────────────────────────

export function saveAccessToken(token: string): void {
    const expiresAt = Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
    setCookie(ACCESS_COOKIE,  token,             TOKEN_TTL_DAYS);
    setCookie(EXPIRES_COOKIE, String(expiresAt), TOKEN_TTL_DAYS);
}

function isTokenExpiringSoon(): boolean {
    const raw = getCookie(EXPIRES_COOKIE);
    if (!raw) return true;
    return Date.now() >= Number(raw) - REFRESH_MARGIN;
}

// ─── Token refresh (deduplication) ────────────────────────────────────────────

let isRefreshing    = false;
let refreshPromise: Promise<boolean> | null = null;

async function doRefreshToken(): Promise<boolean> {
    try {
        const isQrAuth = localStorage.getItem('type') === 'qr';

        // Dùng axiosRefresh (không có interceptor) để tránh vòng lặp
        const response = await axiosRefresh.get<string>(
            isQrAuth ? '/session/qr-login/access-token' : '/auth/refresh',
            { timeout: 15000 }
        );

        const newToken = typeof response.data === 'string'
            ? response.data.replace(/^"|"$/g, '').trim()
            : null;

        // Access token hợp lệ luôn là JWT (header.payload.signature -> 3 phần).
        // Nếu backend trả về chuỗi thông báo lỗi với HTTP 200 (vd token bị thu
        // hồi khi admin khóa tài khoản), nó KHÔNG có dạng JWT -> coi như refresh
        // thất bại để interceptor đăng xuất user thay vì lưu chuỗi rác làm token.
        if (!newToken || newToken.split('.').length !== 3) return false;

        saveAccessToken(newToken);
        return true;
    } catch {
        return false;
    }
}

async function ensureFreshToken(): Promise<boolean> {
    if (isRefreshing && refreshPromise) return refreshPromise;

    isRefreshing   = true;
    refreshPromise = doRefreshToken().finally(() => {
        isRefreshing   = false;
        refreshPromise = null;
    });

    return refreshPromise;
}

// ─── Request interceptor ──────────────────────────────────────────────────────

axiosClient.interceptors.request.use(
    async (config) => {
        if (isPublicEndpoint(config.url)) return config;

        if (isTokenExpiringSoon()) {
            await ensureFreshToken();
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ─── Response interceptor (retry + auth refresh) ─────────────────────────────

axiosClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as RetryConfig | undefined;
        if (!config) return Promise.reject(error);

        const status = error.response?.status;

        // --- Auth refresh (401) — chỉ thử 1 lần ---
        if (status === 401 && !isPublicEndpoint(config.url) && !config._retry) {
            config._retry = true;

            const ok = await ensureFreshToken();
            if (ok) {
                return axiosClient(config);
            }

            clearAuthStorage();
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }

        // --- Retry với exponential backoff ---
        const retryCount = config._retryCount ?? 0;

        if (retryCount < MAX_RETRIES && isRetryable(error)) {
            config._retryCount = retryCount + 1;

            const backoff = RETRY_BASE_DELAY * Math.pow(2, retryCount);
            const jitter  = backoff * (0.5 + Math.random() * 0.5);

            console.warn(
                `[axios-retry] Retry ${config._retryCount}/${MAX_RETRIES} after ${Math.round(jitter)}ms — ${config.method?.toUpperCase()} ${config.url} (${error.code || status})`
            );

            await delay(jitter);
            return axiosClient(config);
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
