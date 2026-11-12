import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background,box-shadow,transform,color,border-color] duration-200 select-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-px";

const variants: Record<Variant, string> = {
  primary:
    "text-ink-950 bg-[linear-gradient(100deg,#c4b5fd,#67e8f9_55%,#6ee7b7)] shadow-[0_0_0_1px_rgb(255_255_255/0.2)_inset,0_10px_30px_-10px_rgb(103_232_249/0.55)] hover:shadow-[0_0_0_1px_rgb(255_255_255/0.35)_inset,0_14px_40px_-10px_rgb(103_232_249/0.75)] hover:brightness-110",
  secondary:
    "text-fg bg-ink-750 border border-line-strong hover:border-[rgb(167_139_250/0.55)] hover:bg-ink-700",
  ghost: "text-fg-muted hover:text-fg hover:bg-white/5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-xl",
  md: "h-11 px-5 text-sm rounded-xl",
  lg: "h-13 px-7 text-base rounded-2xl",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & { href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: CommonProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  return (
    <button type={type} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}
