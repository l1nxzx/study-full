import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { fieldClasses } from "./input";

function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClasses, "flex min-h-16 px-3 py-2 leading-relaxed", className)} {...props} />;
}

export { Textarea };
