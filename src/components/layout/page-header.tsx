import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  } | ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  // Check if action is a ReactNode (custom component) or an object
  const isCustomAction = action && typeof action === "object" && !("label" in action);

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        isCustomAction ? (
          action
        ) : "href" in action && action.href ? (
          <Button asChild>
            <Link href={action.href}>
              <Plus className="mr-2 h-4 w-4" />
              {action.label}
            </Link>
          </Button>
        ) : "label" in action ? (
          <Button onClick={"onClick" in action ? action.onClick : undefined}>
            <Plus className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        ) : null
      )}
    </div>
  );
}
