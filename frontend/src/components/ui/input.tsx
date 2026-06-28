import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg px-3.5 py-2 text-sm",
          "glass-input text-text-primary",
          "placeholder:text-text-tertiary",
          "transition-all duration-200 ease-out",
          "focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50 focus:bg-white/[0.06]",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
