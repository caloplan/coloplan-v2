/**
 * 图片上传（fastapi-file-service 最轻量集成：单个函数，不建 SDK）。
 *
 * 链路：RN 选图 → POST {baseURL}/api/v1/files（Bearer token，multipart 字段 `file`）
 * → 返回 {key, url} → 把 url 交给 caloplan-chat 作为 image_url 内容块 → 后端
 * 组装成 DeepSeek 视觉输入。下载（GET /files/{dir}/{key}）公开，无需凭证。
 *
 * 上传限制由服务端管控：jpg/jpeg/png/webp、单文件 ≤5MB。
 */

export interface UploadImageOptions {
  /** fastapi-file-service 根地址，如 `http://localhost:9094` */
  baseURL: string;
  /** user-service 签发的 access token（JWT，type=access） */
  token: string;
}

/** 上传一张图片，返回可公开访问的 url（失败抛带 detail 的 Error） */
export async function uploadImage(
  file: File,
  options: UploadImageOptions,
): Promise<string> {
  const base = options.baseURL.replace(/\/+$/, "");
  const form = new FormData();
  form.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${options.token}` },
      body: form,
    });
  } catch (err) {
    throw new Error(
      `图片上传网络失败：${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // 错误体不是 JSON：用状态码兜底
    }
    throw new Error(`图片上传失败（${detail}）`);
  }

  const data = (await response.json()) as { key: string; url: string };
  if (!data.url) throw new Error("图片上传失败：响应缺少 url");
  return toPublicUrl(data.url, base);
}

/**
 * 兜底：file 服务经 nginx 反代时 request.url_for 可能基于错误的 Host 头
 * 返回 localhost 开头的 URL（如 http://localhost/api/v1/files/...）。
 * 上传时我们知道真实服务地址（options.baseURL），把 localhost 的 origin
 * 替换为真实地址，保证前端预览可用。
 * 注意：替换仅影响本机展示；若需给 DeepSeek 等外部服务消费，仍须在服务端修正。
 */
function toPublicUrl(raw: string, baseURL: string): string {
  try {
    const u = new URL(raw);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "0.0.0.0") {
      const base = baseURL.replace(/\/+$/, "");
      return `${base}${u.pathname}${u.search}`;
    }
  } catch {
    // 不是合法 URL：原样返回
  }
  return raw;
}
