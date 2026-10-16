import {
  LayoutDashboard, Watch, Sparkles, FileSpreadsheet, Boxes, ShoppingBag, Users, Star, TicketPercent, Gem, FolderTree,
  Layers, GalleryHorizontalEnd, Mail, Newspaper, Settings, ScrollText, Plus,
} from "lucide-react";

/** Sidebar groups. `badge` keys map to counts supplied by the layout. */
export const NAV = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, keys: "g d" }],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: Watch, keys: "g p" },
      { href: "/admin/ai-studio", label: "AI Studio", icon: Sparkles, accent: true },
      { href: "/admin/import", label: "Bulk Import", icon: FileSpreadsheet },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes, badge: "lowStock" },
      { href: "/admin/brands", label: "Brands", icon: Gem },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/collections", label: "Collections", icon: Layers },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag, badge: "pendingOrders", keys: "g o" },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/reviews", label: "Reviews", icon: Star, badge: "pendingReviews" },
      { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
    ],
  },
  {
    label: "Storefront",
    items: [
      { href: "/admin/banners", label: "Banners & Homepage", icon: GalleryHorizontalEnd },
      { href: "/admin/messages", label: "Messages", icon: Mail, badge: "unreadMessages" },
      { href: "/admin/newsletter", label: "Newsletter", icon: Newspaper },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/ai-logs", label: "AI Logs", icon: ScrollText },
    ],
  },
];

export const QUICK_ACTIONS = [
  { href: "/admin/products/new", label: "New product", icon: Plus, hint: "Create with AI auto-fill" },
  { href: "/admin/ai-studio", label: "Photos → draft products", icon: Sparkles, hint: "AI Studio" },
  { href: "/admin/import", label: "Import CSV", icon: FileSpreadsheet },
  { href: "/admin/orders?status=PENDING", label: "Pending orders", icon: ShoppingBag },
  { href: "/admin/coupons", label: "Create coupon", icon: TicketPercent },
];
