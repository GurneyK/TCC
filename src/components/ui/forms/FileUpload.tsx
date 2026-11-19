import { FileUp } from "lucide-react";

export interface FileUploadProps {
  description?: string;
  label?: string;
  accept?: string;
  onFile?: (file: File) => void;
}

export function FileUpload({ accept, description = "SVG, PNG, CSV, or PDF up to 10 MB.", label = "Upload a file", onFile }: FileUploadProps) {
  return (
    <label className="focus-within:focus-ring block cursor-pointer rounded-h3lLg border border-dashed border-gray-300 bg-white p-6 text-center shadow-h3lXs hover:bg-gray-50 focus-within:border-brand-300">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-h3lMd bg-brand-50 text-brand-700">
        <FileUp aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className="mt-3 block text-sm font-semibold text-gray-900">{label}</span>
      <span className="mt-1 block text-sm text-gray-500">{description}</span>
      <input
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile?.(file);
          event.target.value = "";
        }}
        type="file"
      />
    </label>
  );
}
