import { API_BASE, fetchApi, getStoredAuthHeaders, parseApiResponse } from './auth';

export interface SourceTreeNode {
  name: string;
  type: 'directory' | 'file';
  children?: SourceTreeNode[];
}

export interface SourceTreeResponse {
  root: string;
  tree: SourceTreeNode[];
}

export interface SecurityAuditLog {
  id: number;
  user_id: number | null;
  email: string;
  event: string;
  timestamp: string;
  ip_address: string | null;
  status: string;
  is_suspicious: boolean;
  alert_reason: string | null;
  details: string | null;
}

export interface SecurityAuditResponse {
  total_users: number;
  logins_today: number;
  active_alerts: number;
  logs: SecurityAuditLog[];
}

export interface AuditorReadLog {
  id: number;
  timestamp: string;
  auditor_name: string;
  email: string;
  module: string;
}

export async function fetchSourceTree(): Promise<SourceTreeResponse> {
  const response = await fetchApi(`${API_BASE}/system/source-code`, {
    headers: getStoredAuthHeaders(),
  });
  const result = await parseApiResponse<SourceTreeResponse>(response);

  if (
    !result
    || typeof result.root !== 'string'
    || !Array.isArray(result.tree)
    || result.tree.some((node) => !node.name || !['directory', 'file'].includes(node.type))
  ) {
    throw new Error('El árbol de archivos recibido del servidor no es válido.');
  }

  return result;
}

export async function fetchSecurityAudit(): Promise<SecurityAuditResponse> {
  const response = await fetchApi(`${API_BASE}/admin/security-logs`, {
    headers: getStoredAuthHeaders(),
  });
  const result = await parseApiResponse<SecurityAuditResponse>(response);

  if (
    !result
    || !Number.isInteger(result.total_users)
    || !Number.isInteger(result.logins_today)
    || !Number.isInteger(result.active_alerts)
    || !Array.isArray(result.logs)
    || result.logs.some((log) => (
      !Number.isInteger(log.id)
      || typeof log.email !== 'string'
      || typeof log.event !== 'string'
      || typeof log.timestamp !== 'string'
      || Number.isNaN(Date.parse(log.timestamp))
      || typeof log.status !== 'string'
      || typeof log.is_suspicious !== 'boolean'
    ))
  ) {
    throw new Error('El registro de auditoría recibido del servidor no es válido.');
  }

  return result;
}

export async function fetchAuditorReadLogs(): Promise<AuditorReadLog[]> {
  const response = await fetchApi(`${API_BASE}/admin/auditor-read-logs`, {
    headers: getStoredAuthHeaders(),
  });
  const logs = await parseApiResponse<AuditorReadLog[]>(response);

  if (!Array.isArray(logs) || logs.some((log) => (
    !Number.isInteger(log.id)
    || typeof log.timestamp !== 'string'
    || Number.isNaN(Date.parse(log.timestamp))
    || typeof log.auditor_name !== 'string'
    || typeof log.email !== 'string'
    || typeof log.module !== 'string'
  ))) {
    throw new Error('El registro de lecturas Auditor recibido del servidor no es válido.');
  }

  return logs;
}
