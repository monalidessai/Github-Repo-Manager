import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[#E8DBCB] bg-[#FDFBF7] text-[#5E4432] font-semibold",
        secondary:
          "border-[#E5E5E5] bg-[#F4EFEA] text-[#1A1A1A]",
        destructive:
          "border-rose-200 bg-rose-50 text-rose-800 font-semibold",
        warning:
          "border-amber-200 bg-amber-50 text-amber-900 font-semibold",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-900 font-semibold",
        outline: "text-[#1A1A1A] border-[#E5E5E5] bg-white",
        gold: "border-[#C5A880]/40 bg-[#F5EFE6] text-[#7D5E46] font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
