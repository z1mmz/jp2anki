import React from "react";

type Props = {
  canExtract: boolean;
  canDownload: boolean;
  busy: boolean;
  onExtract: () => void;
  onDownload: () => void;
};

export default function Controls({
  canExtract, canDownload, busy, onExtract, onDownload,
}: Props) {
  return (
    <div className="flex gap-2 mb-4">
      <button
        onClick={onExtract}
        disabled={!canExtract || busy}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {busy ? "Working…" : "Extract unique words"}
      </button>
      <button
        onClick={onDownload}
        disabled={!canDownload || busy}
        className="px-4 py-2 rounded border"
      >
        Download .apkg
      </button>
    </div>
  );
}
