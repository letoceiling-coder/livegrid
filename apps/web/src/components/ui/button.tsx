import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Site-wide button system — PRIMARY / SECONDARY / GHOST.
 * Brand color: CSS `--primary` (hsl 206 89% 60%, same as «Войти»).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground font-semibold hover:opacity-90",
        secondary:
          "bg-transparent text-primary border-[1.5px] border-primary font-medium hover:bg-primary/[0.08]",
        ghost:
          "bg-transparent text-primary font-medium border-0 shadow-none hover:underline underline-offset-4",
        default: "bg-primary text-primary-foreground font-semibold hover:opacity-90",
        destructive: "bg-destructive text-destructive-foreground font-semibold hover:opacity-90",
        outline:
          "bg-transparent text-primary border-[1.5px] border-primary font-medium hover:bg-primary/[0.08]",
        link: "text-primary underline-offset-4 hover:underline font-medium",
      },
      size: {
        md: "h-11 min-h-12 sm:min-h-11 rounded-[10px] px-6 py-3 text-[15px]",
        default: "h-11 min-h-12 sm:min-h-11 rounded-[10px] px-6 py-3 text-[15px]",
        sm: "h-8 min-h-8 rounded-[10px] px-3 py-1.5 text-xs font-medium",
        lg: "h-11 min-h-12 sm:min-h-11 rounded-[10px] px-8 text-[15px]",
        icon: "h-11 w-11 min-h-12 sm:min-h-11 rounded-[10px] p-0",
      },
    },
    compoundVariants: [
      {
        variant: ["ghost", "link"],
        className: "!h-auto !min-h-0 !px-0 !py-0 !rounded-none text-sm",
      },
      {
        variant: "ghost",
        size: "sm",
        className: "text-sm",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
