import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "glow"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const variantStyles = {
      default: "bg-accent-primary text-white hover:bg-accent-hover shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/30",
      secondary: "bg-surface text-text-primary border border-border-default hover:bg-surface-elevated hover:border-border-hover",
      destructive: "bg-status-danger/10 text-status-danger border border-status-danger/20 hover:bg-status-danger/20 hover:border-status-danger/30",
      outline: "border border-border-default bg-transparent hover:bg-white/[0.03] text-text-primary hover:border-border-hover",
      ghost: "hover:bg-white/[0.04] text-text-secondary hover:text-text-primary",
      glow: "bg-accent-primary text-white hover:bg-accent-hover shadow-lg shadow-accent-primary/25 hover:shadow-accent-primary/40 glow-border",
    }

    const sizeStyles = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-11 rounded-lg px-8 text-[15px]",
      icon: "h-9 w-9",
    }

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base",
          "disabled:pointer-events-none disabled:opacity-40",
          "active:scale-[0.97]",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
