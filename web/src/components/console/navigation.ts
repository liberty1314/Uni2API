import type { LucideIcon } from "lucide-react";
import { Bot, FileCog, GalleryVerticalEnd, Images, LayoutDashboard, ListTree, Settings2, UserRoundCog, Wrench } from "lucide-react";

import type { AuthRole } from "@/store/auth";

export type ConsoleNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: AuthRole[];
  group: "workspace" | "operations" | "lab";
};

export const consoleNavigation: ConsoleNavigationItem[] = [
  { href: "/", label: "工作台", icon: LayoutDashboard, roles: ["admin", "user"], group: "workspace" },
  { href: "/image", label: "开始创作", icon: Bot, roles: ["admin", "user"], group: "workspace" },
  { href: "/image-manager", label: "图片库", icon: Images, roles: ["admin"], group: "workspace" },
  { href: "/accounts", label: "账户池", icon: ListTree, roles: ["admin"], group: "operations" },
  { href: "/users", label: "用户管理", icon: UserRoundCog, roles: ["admin"], group: "operations" },
  { href: "/logs", label: "运行日志", icon: GalleryVerticalEnd, roles: ["admin"], group: "operations" },
  { href: "/settings", label: "设置", icon: Settings2, roles: ["admin"], group: "operations" },
  { href: "/debug", label: "实验室", icon: Wrench, roles: ["admin"], group: "lab" },
  { href: "#canvas", label: "无限画布", icon: FileCog, roles: ["admin", "user"], group: "workspace" },
];

export function visibleNavigation(role: AuthRole) {
  return consoleNavigation.filter((item) => item.roles.includes(role));
}
