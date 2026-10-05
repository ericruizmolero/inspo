"use client";

// Its own file: the empty board shows it, and importing it from DirectoryModal brought the whole modal along
import { Icons } from "./Sidebar";
import { useT } from "./I18nProvider";

/** Saves a directory site into the library. Once it is there, it says so and stays still. */
export default function AddToLibrary({ url, name, onAdd, added, className = "" }: {
  url: string; name: string; onAdd: (url: string) => void; added: boolean; className?: string;
}) {
  const { t } = useT();
  return (
    <button type="button" className={`dir-add${added ? " is-added" : ""} ${className}`} disabled={added}
      onClick={() => onAdd(url)} aria-label={added ? t.directory.addedLabel(name) : t.directory.addLabel(name)}>
      {added ? Icons.check : Icons.plus}<span>{added ? t.directory.added : t.directory.add}</span>
    </button>
  );
}
