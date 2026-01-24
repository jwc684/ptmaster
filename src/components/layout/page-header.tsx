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
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {customAction ? (
        customAction
      ) : action && (
        action.href ? (
          <Button asChild>
            <Link href={action.href}>
              <Plus className="mr-2 h-4 w-4" />
              {action.label}
            </Link>
          </Button>
        ) : (
          <Button onClick={action.onClick}>
            <Plus className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}
