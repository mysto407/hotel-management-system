// src/components/common/Card.jsx
import { cn } from "@/lib/utils";
import {
  Card as ShadCard,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

export const Card = ({ title, children, className = "" }) => (
  <ShadCard className={cn("mb-6", className)}>
    {title && (
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
    )}
    <CardContent>{children}</CardContent>
  </ShadCard>
);