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

export async function uploadToQiniu(
  file: File,
  onProgress?: (percent: number) => void
): Promise<QiniuUploadResult> {
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
        } catch {
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
  return apiClient.get('/upload/sign-url', { params: { fileUrl } });
}
