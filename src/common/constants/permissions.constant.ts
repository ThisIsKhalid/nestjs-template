/**
 * Single source of truth for all system permissions.
 * Follows the resource:action naming formula.
 */
export const PERMISSIONS = {
  // --- CATALOG ---
  PRODUCT_VIEW: 'product:view',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',

  // --- PRICING ---
  PRICE_VIEW: 'price:view',
  PRICE_CREATE: 'price:create',
  PRICE_APPROVE: 'price:approve',

  // --- ORDERS & FULFILLMENT ---
  ORDER_VIEW: 'order:view',
  ORDER_CONFIRM: 'order:confirm',
  ORDER_CANCEL: 'order:cancel',
  ORDER_STATUS_UPDATE: 'order:status_update',

  // --- INVENTORY ---
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_ADJUST: 'inventory:adjust',

  // --- SALES / POS ---
  SALE_CREATE: 'sale:create',
  SALE_VOID: 'sale:void',

  // --- STAFF & ACCESS ---
  STAFF_MANAGE: 'staff:manage',
  ROLE_MANAGE: 'role:manage',
  AUDIT_VIEW: 'audit:view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Built-in System Roles
 */
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  STORE_MANAGER: 'STORE_MANAGER',
  SALES_STAFF: 'SALES_STAFF',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

/**
 * Metadata for seeding and UI display
 */
export interface PermissionDefinition {
  key: PermissionKey;
  description: string;
}

export const PERMISSIONS_LIST: PermissionDefinition[] = [
  // Catalog
  { key: PERMISSIONS.PRODUCT_VIEW, description: 'Can view products and catalog details' },
  { key: PERMISSIONS.PRODUCT_CREATE, description: 'Can create new products and variants' },
  { key: PERMISSIONS.PRODUCT_UPDATE, description: 'Can edit product details and status' },
  { key: PERMISSIONS.PRODUCT_DELETE, description: 'Can delete or archive products' },

  // Pricing
  { key: PERMISSIONS.PRICE_VIEW, description: 'Can view product prices and margins' },
  { key: PERMISSIONS.PRICE_CREATE, description: 'Can propose product prices' },
  { key: PERMISSIONS.PRICE_APPROVE, description: 'Can approve promotional and base prices' },

  // Orders & Fulfillment
  { key: PERMISSIONS.ORDER_VIEW, description: 'Can view customer orders' },
  { key: PERMISSIONS.ORDER_CONFIRM, description: 'Can confirm pending orders' },
  { key: PERMISSIONS.ORDER_CANCEL, description: 'Can cancel customer orders' },
  { key: PERMISSIONS.ORDER_STATUS_UPDATE, description: 'Can update order status and delivery milestones' },

  // Inventory
  { key: PERMISSIONS.INVENTORY_VIEW, description: 'Can view stock levels and reservations' },
  { key: PERMISSIONS.INVENTORY_ADJUST, description: 'Can perform stock adjustments and recounts' },

  // Sales / POS
  { key: PERMISSIONS.SALE_CREATE, description: 'Can record manual or POS counter sales' },
  { key: PERMISSIONS.SALE_VOID, description: 'Can void recorded manual sales' },

  // Staff & RBAC
  { key: PERMISSIONS.STAFF_MANAGE, description: 'Can invite and manage staff members' },
  { key: PERMISSIONS.ROLE_MANAGE, description: 'Can create and configure roles and permissions' },
  { key: PERMISSIONS.AUDIT_VIEW, description: 'Can inspect system audit logs' },
];

/**
 * Role Permission Defaults for Seeding
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, PermissionKey[]> = {
  [SYSTEM_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [SYSTEM_ROLES.STORE_MANAGER]: [
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.PRICE_VIEW,
    PERMISSIONS.PRICE_CREATE,
    PERMISSIONS.PRICE_APPROVE,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_CONFIRM,
    PERMISSIONS.ORDER_CANCEL,
    PERMISSIONS.ORDER_STATUS_UPDATE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.SALE_CREATE,
    PERMISSIONS.SALE_VOID,
    PERMISSIONS.AUDIT_VIEW,
  ],
  [SYSTEM_ROLES.SALES_STAFF]: [
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_CONFIRM,
    PERMISSIONS.SALE_CREATE,
    PERMISSIONS.INVENTORY_VIEW,
  ],
  [SYSTEM_ROLES.WAREHOUSE_STAFF]: [
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_STATUS_UPDATE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
  ],
};
