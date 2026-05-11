"use client";

import type { ReactNode } from "react";

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <table className={`min-w-full ${className}`}>{children}</table>;
}

export function TableHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <thead className={className}>{children}</thead>;
}

export function TableBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tbody className={className}>{children}</tbody>;
}

export function TableRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tr className={className}>{children}</tr>;
}

export function TableCell({
  children,
  className = "",
  isHeader = false,
}: {
  children: ReactNode;
  className?: string;
  isHeader?: boolean;
}) {
  const Component = isHeader ? "th" : "td";
  return <Component className={className}>{children}</Component>;
}

