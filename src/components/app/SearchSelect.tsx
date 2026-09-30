import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string; hint?: string };

export function SearchSelect({
  options, value, onChange, placeholder = "Select…", allowClear, invalid, id, required,
}: {
  options: Option[]; value: string; onChange: (v: string) => void; placeholder?: string;
  allowClear?: boolean; invalid?: boolean; id?: string; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const sel = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-required={required || undefined}
          className={cn(
            "flex h-12 w-full items-center justify-between rounded-md border border-input bg-card px-3 text-left text-base",
            "focus:outline-none focus:ring-2 focus:ring-ring",
            invalid && "border-destructive",
          )}
        >
          <span className={cn("truncate", !sel && "text-muted-foreground")}>{sel ? sel.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" className="h-11" />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem value="__none" onSelect={() => { onChange(""); setOpen(false); }} className="py-2.5 text-muted-foreground">
                  — None —
                </CommandItem>
              )}
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.hint ?? ""}`}
                  onSelect={() => { onChange(o.value); setOpen(false); }}
                  className="py-2.5"
                >
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1">{o.label}</span>
                  {o.hint && <span className="text-xs text-muted-foreground">{o.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
