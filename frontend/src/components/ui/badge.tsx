import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "outline" | "destructive"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-white/[0.06] text-text-secondary border-white/[0.06]",
    success: "bg-status-success/10 text-status-success border-status-success/20",
    warning: "bg-status-warning/10 text-status-warning border-status-warning/20",
    danger: "bg-status-danger/10 text-status-danger border-status-danger/20",
    destructive: "bg-status-danger/10 text-status-danger border-status-danger/20",
    outline: "text-text-secondary border-border-default bg-transparent",
  }

  const dotStyles = {
    default: "bg-text-tertiary",
    success: "bg-status-success",
    warning: "bg-status-warning animate-pulse",
    danger: "bg-status-danger",
    destructive: "bg-status-danger",
    outline: "hidden",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {variant !== 'outline' && (
        <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", dotStyles[variant])} />
      )}
      {props.children}
    </div>
  )
}

export { Badge }
