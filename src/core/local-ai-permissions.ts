export const OLLAMA_PERMISSION_ORIGIN = 'http://127.0.0.1:11434/*';
export const FIREFOX_LOCAL_AI_DATA_PERMISSIONS = ['websiteContent', 'browsingActivity'] as const;

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
  requestDataCollection(): Promise<LocalAIPermissionRequestResult>;
  requestOrigin(): Promise<LocalAIPermissionRequestResult>;
  rollbackRequest(): Promise<boolean>;
  has(): Promise<boolean>;
  hasAny(): Promise<boolean>;
  remove(): Promise<boolean>;
}

const originPermission = { origins: [OLLAMA_PERMISSION_ORIGIN] };
const dataCollectionPermission = {
  data_collection: [...FIREFOX_LOCAL_AI_DATA_PERMISSIONS],
};

function supportsDataCollection(permissions: PermissionSet): permissions is PermissionSet & {
  data_collection: string[];
} {
  return Array.isArray(permissions.data_collection);
}

function hasAllDataPermissions(granted: string[]): boolean {
  return FIREFOX_LOCAL_AI_DATA_PERMISSIONS.every((permission) => granted.includes(permission));
}

function hasAnyDataPermission(granted: string[]): boolean {
  return FIREFOX_LOCAL_AI_DATA_PERMISSIONS.some((permission) => granted.includes(permission));
}

export function createLocalAIPermissionManager(
  permissions: LocalAIPermissionApi,
  firefox: boolean,
): LocalAIPermissionManager {
  let acquiredByLastRequest: PermissionSet[] = [];
  let cleanupInspectionRequired = false;
  let enableStage: 'idle' | 'data-granted' | 'origin-granted' = 'idle';

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
    if (failed.length === 0) {
      enableStage = 'idle';
      cleanupInspectionRequired = false;
    }
    return failed.length === 0;
  }

  return {
    async requestDataCollection() {
      if (!firefox) return 'unsupported';
      if (cleanupInspectionRequired || acquiredByLastRequest.length > 0 || enableStage !== 'idle') {
        return 'cleanup-required';
      }

      let request: Promise<boolean>;
      try {
        request = permissions.request(dataCollectionPermission);
      } catch {
        return 'unsupported';
      }
      try {
        if (!(await request)) return 'denied';
      } catch {
        return 'unsupported';
      }
      acquiredByLastRequest = [dataCollectionPermission];
      enableStage = 'data-granted';
      return 'granted';
    },

    async requestOrigin() {
      if (cleanupInspectionRequired) return 'cleanup-required';
      if (firefox) {
        if (enableStage !== 'data-granted') return 'cleanup-required';
      } else if (acquiredByLastRequest.length > 0 || enableStage !== 'idle') {
        return 'cleanup-required';
      }

      let request: Promise<boolean>;
      try {
        request = permissions.request(originPermission);
      } catch {
        return 'denied';
      }
      try {
        if (!(await request)) return 'denied';
      } catch {
        return 'denied';
      }
      acquiredByLastRequest.push(originPermission);
      enableStage = 'origin-granted';
      return 'granted';
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
        return supportsDataCollection(granted) && hasAllDataPermissions(granted.data_collection);
      } catch {
        return false;
      }
    },

    async hasAny() {
      try {
        const hasOrigin = await permissions.contains(originPermission);
        if (!firefox) {
          cleanupInspectionRequired = hasOrigin;
          return hasOrigin;
        }
        if (typeof permissions.getAll !== 'function') {
          throw new Error('Firefox data-consent permission inspection is unavailable.');
        }
        const granted = await permissions.getAll();
        if (!supportsDataCollection(granted)) {
          throw new Error('Firefox data-consent permission inspection is unavailable.');
        }
        const hasAnyGrant = hasOrigin || hasAnyDataPermission(granted.data_collection);
        cleanupInspectionRequired = hasAnyGrant;
        return hasAnyGrant;
      } catch (error) {
        cleanupInspectionRequired = true;
        throw error;
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
      if (hasOrigin) permissionSets.push(originPermission);
      if (dataCollection !== undefined && hasAnyDataPermission(dataCollection)) {
        permissionSets.push(dataCollectionPermission);
      }

      if (!originInspected || (firefox && dataCollection === undefined)) return false;
      const removed = await removeSets(permissionSets);
      if (removed) {
        acquiredByLastRequest = [];
        cleanupInspectionRequired = false;
        enableStage = 'idle';
      }
      return removed;
    },
  };
}
