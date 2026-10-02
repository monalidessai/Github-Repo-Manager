import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#1A1A1A] hover:bg-[#2C221E] text-[#FDFBF7] shadow-sm border border-[#1A1A1A]",
        destructive:
          "bg-rose-800 hover:bg-rose-900 text-white shadow-sm border border-rose-800",
        outline:
          "border border-[#E5E5E5] bg-white hover:bg-[#FDFBF7] hover:border-[#C5A880] text-[#1A1A1A] shadow-sm",
        secondary:
          "bg-[#F4EFEA] text-[#1A1A1A] shadow-sm hover:bg-[#E8DBCB] border border-[#E5E5E5] font-semibold",
        ghost:
          "hover:bg-[#F5EFE6] hover:text-[#1A1A1A] text-[#5A5A5A] font-medium",
        link: "text-[#C5A880] underline-offset-4 hover:underline font-semibold",
        gradient: "bg-[#1A1A1A] hover:bg-[#2C221E] text-[#FDFBF7] border border-[#C5A880]/60 shadow-md shadow-amber-900/5 font-semibold",
        gold: "bg-[#C5A880] hover:bg-[#B8977E] text-white shadow-md border border-[#C5A880] font-semibold",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-sm font-semibold tracking-wider uppercase",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
