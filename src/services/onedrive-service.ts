import type { OneDriveAuthInfo } from './onedrive';

const BASE_GRAPH_URL = 'https://graph.microsoft.com/v1.0';

export interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  mimeType?: string;
  parentReference?: {
    id: string;
  };
}

export interface OneDriveFolder {
  id: string;
  name: string;
  folder: {
    childCount: number;
  };
  parentReference?: {
    id: string;
  };
}

export interface SearchResult {
  success: boolean;
  files?: OneDriveFile[];
  folders?: OneDriveFolder[];
  error?: string;
}

export interface CreateFolderResult {
  success: boolean;
  folderId?: string;
  error?: string;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  content?: string;
  error?: string;
}

class OneDriveService {
  private authInfo: OneDriveAuthInfo | null = null;

  setAuthInfo(authInfo: OneDriveAuthInfo) {
    this.authInfo = authInfo;
  }

  private getHeaders(): HeadersInit {
    if (!this.authInfo?.accessToken) {
      console.warn('OneDrive not authenticated - authentication required');
      throw new Error('OneDrive authentication required');
    }
    return {
      'Authorization': `Bearer ${this.authInfo.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async searchFiles(query: string, parentFolderId?: string): Promise<SearchResult> {
    try {
      let url: string;
      if (parentFolderId) {
        url = `${BASE_GRAPH_URL}/me/drive/items/${parentFolderId}/children?$filter=contains(name,'${query}')`;
      } else {
        url = `${BASE_GRAPH_URL}/me/drive/root/search(q='${query}')`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        return { success: false, error: `Search failed: ${errorData.message || response.statusText}` };
      }

      const data = await response.json();
      const files: OneDriveFile[] = [];
      const folders: OneDriveFolder[] = [];

      data.value?.forEach((item: any) => {
        if (item.folder) {
          folders.push({
            id: item.id,
            name: item.name,
            folder: item.folder,
            parentReference: item.parentReference
          });
        } else {
          files.push({
            id: item.id,
            name: item.name,
            size: item.size,
            lastModifiedDateTime: item.lastModifiedDateTime,
            mimeType: item.file?.mimeType,
            parentReference: item.parentReference
          });
        }
      });

      return { success: true, files, folders };
    } catch (error: any) {
      return { success: false, error: `Search error: ${error.message}` };
    }
  }

  async createFolder(name: string, parentFolderId?: string): Promise<CreateFolderResult> {
    try {
      const url = parentFolderId 
        ? `${BASE_GRAPH_URL}/me/drive/items/${parentFolderId}/children`
        : `${BASE_GRAPH_URL}/me/drive/root/children`;

      const body = {
        name,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        return { success: false, error: `Create folder failed: ${errorData.message || response.statusText}` };
      }

      const data = await response.json();
      return { success: true, folderId: data.id };
    } catch (error: any) {
      return { success: false, error: `Create folder error: ${error.message}` };
    }
  }

  async uploadFile(fileName: string, content: string, parentFolderId?: string): Promise<UploadResult> {
    try {
      const url = parentFolderId
        ? `${BASE_GRAPH_URL}/me/drive/items/${parentFolderId}:/${fileName}:/content`
        : `${BASE_GRAPH_URL}/me/drive/root:/${fileName}:/content`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.authInfo?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: content
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        return { success: false, error: `Upload failed: ${errorData.message || response.statusText}` };
      }

      const data = await response.json();
      return { success: true, fileId: data.id };
    } catch (error: any) {
      return { success: false, error: `Upload error: ${error.message}` };
    }
  }

  async downloadFile(fileId: string): Promise<DownloadResult> {
    try {
      const url = `${BASE_GRAPH_URL}/me/drive/items/${fileId}/content`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authInfo?.accessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'File not found' };
        }
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        return { success: false, error: `Download failed: ${errorData.message || response.statusText}` };
      }

      const content = await response.text();
      return { success: true, content };
    } catch (error: any) {
      return { success: false, error: `Download error: ${error.message}` };
    }
  }

  async updateFile(fileId: string, content: string): Promise<UploadResult> {
    try {
      const url = `${BASE_GRAPH_URL}/me/drive/items/${fileId}/content`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.authInfo?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: content
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        return { success: false, error: `Update failed: ${errorData.message || response.statusText}` };
      }

      const data = await response.json();
      return { success: true, fileId: data.id };
    } catch (error: any) {
      return { success: false, error: `Update error: ${error.message}` };
    }
  }

  async deleteFile(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${BASE_GRAPH_URL}/me/drive/items/${fileId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authInfo?.accessToken}`
        }
      });

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        return { success: false, error: `Delete failed: ${errorData.message || response.statusText}` };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: `Delete error: ${error.message}` };
    }
  }

  async listFiles(parentFolderId: string): Promise<OneDriveFile[]> {
    try {
      const url = `${BASE_GRAPH_URL}/me/drive/items/${parentFolderId}/children`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`List files failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.value?.filter((item: any) => !item.folder).map((item: any) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        lastModifiedDateTime: item.lastModifiedDateTime,
        mimeType: item.file?.mimeType,
        parentReference: item.parentReference
      })) || [];
    } catch (error: any) {
      console.error('List files error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const oneDriveService = new OneDriveService();