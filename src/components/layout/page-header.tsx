import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

interface ActionButton {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ActionButton;
  customAction?: ReactNode;
}

export function PageHeader({ title, description, action, customAction }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground truncate">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        {customAction ? (
          customAction
        ) : action && (
          action.href ? (
            <Button asChild size="sm" className="whitespace-nowrap">
              <Link href={action.href}>
                <Plus className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">{action.label}</span>
                <span className="sm:hidden">추가</span>
              </Link>
            </Button>
          ) : (
            <Button onClick={action.onClick} size="sm" className="whitespace-nowrap">
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">추가</span>
            </Button>
          )
        )}
      </div>
    </div>
  );
}
