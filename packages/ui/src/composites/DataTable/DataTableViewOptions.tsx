import { Settings2 } from 'lucide-react'
import { Button } from '@ops/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@ops/ui/components/ui/dropdown-menu'
import type { DataTableInstance } from './columns'

/** Menu that shows or hides each hideable column. */
export function DataTableViewOptions({ table, label }: Readonly<{ table: DataTableInstance; label: string }>) {
  const hideable = table.getAllLeafColumns().filter((column) => column.getCanHide())
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Settings2 aria-hidden />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {hideable.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(checked) => {
              column.toggleVisibility(checked)
            }}
          >
            {column.columnDef.meta?.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
