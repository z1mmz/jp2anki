import React from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export default function TextArea({ value, onChange, placeholder }: Props) {
  return (
    <textarea
      className="w-full h-48 p-3 border rounded mb-3"
      placeholder={placeholder || "Paste Japanese text here…"}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}
