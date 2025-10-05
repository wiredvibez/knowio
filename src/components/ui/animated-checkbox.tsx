"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AnimatedCheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  size?: "xs" | "sm" | "md" | "lg";
};

export function AnimatedCheckbox({ className, size = "md", ...props }: AnimatedCheckboxProps) {
  const sizeClasses = size === "lg" ? "size-6" : size === "md" ? "size-5" : size === "sm" ? "size-4" : "size-3.5";
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer group inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground shadow-xs outline-none transition-all duration-200 ease-out",
        "focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:border-ring data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        sizeClasses,
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn(
          "pointer-events-none flex items-center justify-center text-current transition-transform duration-200 ease-out",
          "scale-0 group-data-[state=checked]:scale-100"
        )}
      >
        <CheckIcon className={cn(size === "lg" ? "size-4" : size === "md" ? "size-3.5" : size === "sm" ? "size-3" : "size-2.5")} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export default AnimatedCheckbox;


