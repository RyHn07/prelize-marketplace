import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

export function GridIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M3.75 3.75H8.75V8.75H3.75V3.75ZM11.25 3.75H16.25V8.75H11.25V3.75ZM3.75 11.25H8.75V16.25H3.75V11.25ZM11.25 11.25H16.25V16.25H11.25V11.25Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BoxCubeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M10 2.91667L16.25 6.25V13.75L10 17.0833L3.75 13.75V6.25L10 2.91667Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 9.58333L16.25 6.25M10 9.58333L3.75 6.25M10 9.58333V17.0833" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DollarLineIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M10 2.91667V17.0833M12.9167 5.625C12.9167 4.58947 11.6105 3.75 10 3.75C8.3895 3.75 7.08333 4.58947 7.08333 5.625C7.08333 6.66053 8.3895 7.5 10 7.5C11.6105 7.5 12.9167 8.33947 12.9167 9.375C12.9167 10.4105 11.6105 11.25 10 11.25C8.3895 11.25 7.08333 10.4105 7.08333 9.375" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GroupIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M6.66667 8.33333C8.04738 8.33333 9.16667 7.21404 9.16667 5.83333C9.16667 4.45262 8.04738 3.33333 6.66667 3.33333C5.28595 3.33333 4.16667 4.45262 4.16667 5.83333C4.16667 7.21404 5.28595 8.33333 6.66667 8.33333Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.75 9.16667C14.9006 9.16667 15.8333 8.23393 15.8333 7.08333C15.8333 5.93274 14.9006 5 13.75 5C12.5994 5 11.6667 5.93274 11.6667 7.08333C11.6667 8.23393 12.5994 9.16667 13.75 9.16667Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.33333 15C3.33333 12.929 5.01226 11.25 7.08333 11.25H6.25C8.3214 11.25 10 12.929 10 15M11.6667 15C11.6667 13.3892 12.9725 12.0833 14.5833 12.0833H14.7917C16.4025 12.0833 17.7083 13.3892 17.7083 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function FolderIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M2.91667 6.66667C2.91667 5.74619 3.66286 5 4.58333 5H8.03575L9.29733 6.26158C9.45358 6.41783 9.66551 6.50558 9.88646 6.50558H15.4167C16.3371 6.50558 17.0833 7.25177 17.0833 8.17225V13.75C17.0833 14.6705 16.3371 15.4167 15.4167 15.4167H4.58333C3.66286 15.4167 2.91667 14.6705 2.91667 13.75V6.66667Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ListIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M6.25 5H15.8333M6.25 10H15.8333M6.25 15H15.8333M4.16667 5H4.175M4.16667 10H4.175M4.16667 15H4.175" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function PieChartIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M10 2.91667V10H17.0833C17.0833 6.08998 13.91 2.91667 10 2.91667Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.95833 4.01041C5.51374 4.47527 2.91667 7.42641 2.91667 11C2.91667 14.896 6.104 18.0833 10 18.0833C13.5736 18.0833 16.5247 15.4863 16.9896 12.0417H8.95833V4.01041Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function PlugInIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M7.5 2.91667V6.25M12.5 2.91667V6.25M6.66667 6.25H13.3333V8.75C13.3333 10.591 11.841 12.0833 10 12.0833C8.15905 12.0833 6.66667 10.591 6.66667 8.75V6.25ZM10 12.0833V17.0833M7.08333 17.0833H12.9167" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HorizontalDotsIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4.16667 10.8333C4.6269 10.8333 5 10.4602 5 10C5 9.53976 4.6269 9.16667 4.16667 9.16667C3.70643 9.16667 3.33333 9.53976 3.33333 10C3.33333 10.4602 3.70643 10.8333 4.16667 10.8333ZM10 10.8333C10.4602 10.8333 10.8333 10.4602 10.8333 10C10.8333 9.53976 10.4602 9.16667 10 9.16667C9.53976 9.16667 9.16667 9.53976 9.16667 10C9.16667 10.4602 9.53976 10.8333 10 10.8333ZM15.8333 10.8333C16.2936 10.8333 16.6667 10.4602 16.6667 10C16.6667 9.53976 16.2936 9.16667 15.8333 9.16667C15.3731 9.16667 15 9.53976 15 10C15 10.4602 15.3731 10.8333 15.8333 10.8333Z" />
    </svg>
  );
}

export function SidebarIconContainer({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <span className={active ? "text-[#615FFF]" : "text-gray-500 group-hover:text-gray-700"}>
      {children}
    </span>
  );
}
