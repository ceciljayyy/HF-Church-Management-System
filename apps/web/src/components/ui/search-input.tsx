import { Search } from 'lucide-react';

export function SearchInput({
  placeholder = 'Search',
  defaultValue,
}: {
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">
      <Search className="h-4 w-4 text-muted" />
      <input
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-transparent text-primary outline-none placeholder:text-muted"
        name="search"
      />
    </label>
  );
}
