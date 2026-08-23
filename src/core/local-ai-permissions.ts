export const OLLAMA_PERMISSION_ORIGIN = 'http://127.0.0.1:11434/*';
export const FIREFOX_WEBSITE_CONTENT_PERMISSION = 'websiteContent';

export type LocalAIPermissionRequestResult =
  'granted' | 'denied' | 'unsupported' | 'cleanup-required';

interface PermissionSet {
  origins?: string[];
  permissions?: string[];
  data_collection?: string[];
}

export interface LocalAIPermissionApi {
  getAll?(): Promise<PermissionSet>;
  contains(permissions: PermissionSet): Promise<boolean>;
  request(permissions: PermissionSet): Promise<boolean>;
  remove(permissions: PermissionSet): Promise<boolean>;
}

export interface LocalAIPermissionManager {
  request(): Promise<LocalAIPermissionRequestResult>;
  rollbackRequest(): Promise<boolean>;
  has(): Promise<boolean>;
  hasAny(): Promise<boolean>;
  remove(): Promise<boolean>;
}

const originPermission = { origins: [OLLAMA_PERMISSION_ORIGIN] };
const websiteContentPermission = {
  data_collection: [FIREFOX_WEBSITE_CONTENT_PERMISSION],
};

function supportsDataCollection(permissions: PermissionSet): permissions is PermissionSet & {
  data_collection: string[];
} {
  return Array.isArray(permissions.data_collection);
}

export function createLocalAIPermissionManager(
  permissions: LocalAIPermissionApi,
  firefox: boolean,
): LocalAIPermissionManager {
  let acquiredByLastRequest: PermissionSet[] = [];

  async function removeSets(permissionSets: PermissionSet[]): Promise<boolean> {
    let removed = true;
    for (const permissionSet of permissionSets) {
      try {
        removed = (await permissions.remove(permissionSet)) && removed;
      } catch {
        removed = false;
      }
    }
    return removed;
  }

  async function rollbackAcquiredPermissions(): Promise<boolean> {
    const failed: PermissionSet[] = [];
    for (const permissionSet of acquiredByLastRequest) {
      try {
        if (!(await permissions.remove(permissionSet))) failed.push(permissionSet);
      } catch {
        failed.push(permissionSet);
      }
    }
    acquiredByLastRequest = failed;
    return failed.length === 0;
  }

  return {
    async request() {
      if (acquiredByLastRequest.length > 0) return 'cleanup-required';
      if (!firefox) {
        try {
          if (await permissions.contains(originPermission)) return 'granted';
          if (!(await permissions.request(originPermission))) return 'denied';
          acquiredByLastRequest = [originPermission];
          return 'granted';
        } catch {
          return 'denied';
        }
      }

      if (typeof permissions.getAll !== 'function') return 'unsupported';
      let existing: PermissionSet;
      try {
        existing = await permissions.getAll();
      } catch {
        return 'unsupported';
      }
      if (!supportsDataCollection(existing)) return 'unsupported';

      const hadWebsiteContent = existing.data_collection.includes(
        FIREFOX_WEBSITE_CONTENT_PERMISSION,
      );
      const hadOrigin = existing.origins?.includes(OLLAMA_PERMISSION_ORIGIN) ?? false;
      let acquiredWebsiteContent = false;

      try {
        if (!hadWebsiteContent) {
          if (!(await permissions.request(websiteContentPermission))) return 'denied';
          acquiredWebsiteContent = true;
          acquiredByLastRequest.push(websiteContentPermission);
        }
        if (!hadOrigin && !(await permissions.request(originPermission))) {
          if (acquiredWebsiteContent) await rollbackAcquiredPermissions();
          return 'denied';
        }
        if (!hadOrigin) acquiredByLastRequest.push(originPermission);
        return 'granted';
      } catch {
        if (acquiredWebsiteContent) await rollbackAcquiredPermissions();
        return 'denied';
      }
    },

    async rollbackRequest() {
      return rollbackAcquiredPermissions();
    },

    async has() {
      try {
        const hasOrigin = await permissions.contains(originPermission);
        if (!hasOrigin || !firefox) return hasOrigin;
        if (typeof permissions.getAll !== 'function') return false;
        const granted = await permissions.getAll();
        return (
          supportsDataCollection(granted) &&
          granted.data_collection.includes(FIREFOX_WEBSITE_CONTENT_PERMISSION)
        );
      } catch {
        return false;
      }
    },

    async hasAny() {
      let hasOrigin: boolean;
      try {
        hasOrigin = await permissions.contains(originPermission);
      } catch {
        return false;
      }
      if (!firefox) return hasOrigin;
      if (typeof permissions.getAll !== 'function') return hasOrigin;
      try {
        const granted = await permissions.getAll();
        return (
          hasOrigin ||
          (supportsDataCollection(granted) &&
            granted.data_collection.includes(FIREFOX_WEBSITE_CONTENT_PERMISSION))
        );
      } catch {
        return hasOrigin;
      }
    },

    async remove() {
      let hasOrigin = false;
      let originInspected = false;
      let dataCollection: string[] | undefined;
      try {
        hasOrigin = await permissions.contains(originPermission);
        originInspected = true;
      } catch {
        // Report failure below because the current grant could not be established.
      }
      if (firefox && typeof permissions.getAll === 'function') {
        try {
          const granted = await permissions.getAll();
          if (supportsDataCollection(granted)) dataCollection = granted.data_collection;
        } catch {
          // Report failure below because the data grant could not be established.
        }
      }

      const permissionSets: PermissionSet[] = [];
      if (hasOrigin) {
        permissionSets.push(originPermission);
      }
      if (dataCollection?.includes(FIREFOX_WEBSITE_CONTENT_PERMISSION)) {
        permissionSets.push(websiteContentPermission);
      }

      if (!originInspected || (firefox && dataCollection === undefined)) return false;
      const removed = await removeSets(permissionSets);
      if (removed) acquiredByLastRequest = [];
      return removed;
    },
  };
}
