import { type ComponentPropsWithoutRef, type ReactNode } from "react"

import { cn } from "@/lib/utils"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
}

interface BentoCardProps extends ComponentPropsWithoutRef<"article"> {
  name: string
  background?: ReactNode
  Icon: React.ElementType
  description?: string
  eyebrow?: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => (
  <div className={cn("bento-grid", className)} {...props}>{children}</div>
)

const BentoCard = ({ name, className, background, Icon, description, eyebrow, ...props }: BentoCardProps) => (
  <article className={cn("bento-card group", className)} {...props}>
    <div className="bento-card-background">{background}</div>
    <div className="bento-card-top"><span>{eyebrow}</span><Icon aria-hidden="true" /></div>
    <div className="bento-card-copy"><h3>{name}</h3>{description && <p>{description}</p>}</div>
    <i aria-hidden="true" />
  </article>
)

export { BentoCard, BentoGrid }
