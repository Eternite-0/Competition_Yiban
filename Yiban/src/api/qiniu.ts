import apiClient from './client';

const FALLBACK_UPLOAD_URL = 'https://up-z2.qiniup.com';

interface UploadTokenResponse {
  token: string;
  domain: string;
  bucket: string;
  uploadUrl?: string;
}

interface QiniuUploadResult {
  key: string;
  hash: string;
  bucket: string;
  fsize: number;
  url: string;
}

export async function getUploadToken(prefix?: string): Promise<UploadTokenResponse> {
  const params: Record<string, string> = {};
  if (prefix) params.prefix = prefix;
  return apiClient.get('/upload/token', { params });
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function uploadToQiniu(
  file: File,
  onProgress?: (percent: number) => void
): Promise<QiniuUploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`文件大小不能超过50MB（当前: ${(file.size / (1024 * 1024)).toFixed(1)}MB）`);
  }
  const tokenData = await getUploadToken();
  const { token, domain } = tokenData;
  const uploadUrl = tokenData.uploadUrl || FALLBACK_UPLOAD_URL;

  const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
  const key = `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('token', token);
  formData.append('key', key);

  const xhr = new XMLHttpRequest();
  const result = await new Promise<QiniuUploadResult>((resolve, reject) => {
    xhr.open('POST', uploadUrl);
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ ...data, url: `${domain}/${data.key}` });
        } catch (err) {
          console.error(err);
          reject(new Error('解析上传响应失败'));
        }
      } else {
        reject(new Error(`上传失败 (${xhr.status})`));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('网络错误，上传失败')));
    xhr.addEventListener('abort', () => reject(new Error('上传已取消')));
    xhr.send(formData);
  });

  return result;
}

export async function getSignedDownloadUrl(fileUrl: string): Promise<string> {
  if (!fileUrl) return fileUrl;
  // 本地文件直接返回，不走七牛签名
  if (fileUrl.startsWith('/api/file/serve/')) {
    return fileUrl;
  }
  return apiClient.get('/upload/sign-url', { params: { fileUrl } });
}

/**
 * 下载文件 — 本地文件带 auth 头 fetch+blob，七牛文件走签名后 window.open
 */
export async function downloadFile(fileUrl: string, fileName?: string): Promise<void> {
  if (!fileUrl) throw new Error('文件链接为空');

  // 本地文件需要带 Authorization 头
  if (fileUrl.startsWith('/api/file/serve/')) {
    const token = localStorage.getItem('token');
    const response = await fetch(fileUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(`下载失败 (${response.status})`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    return;
  }

  // 七牛文件: 签名后新标签页打开
  const signedUrl = await getSignedDownloadUrl(fileUrl);
  window.open(signedUrl, '_blank');
}
