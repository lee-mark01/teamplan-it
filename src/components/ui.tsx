import type { Member } from "@/lib/types";
import { MEMBER_COLORS } from "@/lib/mock-data";

// ─── Button ───────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-text hover:bg-[#404040]",
  secondary: "bg-surface text-text border border-border-strong hover:bg-surface-2",
  ghost: "bg-transparent text-text-2 hover:text-text hover:bg-surface-2",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-[11px]",
  md: "px-4 py-2.5 text-[13px]",
  lg: "px-5 py-3 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
  children,
  ...props
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] font-medium cursor-pointer transition-all duration-100 ${variantStyles[variant]} ${sizeStyles[size]} ${full ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Badge ────────────────────────────────────────────
const badgeVariants: Record<string, string> = {
  accent: "bg-accent-bg text-accent-text",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  purple: "bg-purple-bg text-purple",
  danger: "bg-danger-bg text-danger",
};

export function Badge({
  variant = "accent",
  children,
  className = "",
}: {
  variant?: keyof typeof badgeVariants;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeVariants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────
export function Avatar({
  member,
  size = "md",
  className = "",
}: {
  member: Member;
  size?: "sm" | "md";
  className?: string;
}) {
  const colors = MEMBER_COLORS[member.color];
  const sizeClass = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-[11px]";
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-semibold ${colors.bg} ${colors.text} ${sizeClass} ${className}`}>
      {member.initial}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────
export function Card({
  children,
  className = "",
  flat = false,
}: {
  children: React.ReactNode;
  className?: string;
  flat?: boolean;
}) {
  if (flat) {
    return <div className={`bg-surface-2 rounded-[var(--radius-lg)] p-3 ${className}`}>{children}</div>;
  }
  return (
    <div className={`bg-surface border border-border rounded-[var(--radius-lg)] p-4 ${className}`}>
      {children}
    </div>
  );
}

// ─── Icon (tabler icons wrapper) ──────────────────────
export function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <i className={`ti ti-${name} ${className}`} />;
}

// ─── Section Number Badge ─────────────────────────────
export function SectionNum({ num }: { num: number | string }) {
  return (
    <span className="bg-primary text-primary-text text-[10px] font-semibold px-2 py-0.5 rounded">
      {String(num).padStart(2, "0")}
    </span>
  );
}
