import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "border-transparent bg-subtle text-text-primary",
    success: "border-transparent bg-green-50 text-status-success",
    warning: "border-transparent bg-amber-50 text-status-warning",
    danger: "border-transparent bg-red-50 text-status-danger",
    outline: "text-text-primary border-border-default",
  }
  
  const dotStyles = {
    default: "bg-gray-400",
    success: "bg-status-success",
    warning: "bg-status-warning animate-pulse",
    danger: "bg-status-danger",
    outline: "hidden",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2",
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
