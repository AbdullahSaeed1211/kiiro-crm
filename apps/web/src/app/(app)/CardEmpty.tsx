/** One-line empty state for a dashboard card: what is missing, then what that means. */
export function CardEmpty({ title, description }: Readonly<{ title: string; description: string }>) {
  return (
    <p className="border-t py-3 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{title}.</span> {description}
    </p>
  )
}
