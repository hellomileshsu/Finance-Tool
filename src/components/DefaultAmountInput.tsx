import {KeyboardEvent, useEffect, useState} from 'react';

type Props = {
  value: number | undefined;
  onCommit: (value: number | null) => void;
};

export function DefaultAmountInput({value, onCommit}: Props) {
  const [local, setLocal] = useState<string>(value ? String(value) : '');

  useEffect(() => {
    setLocal(value ? String(value) : '');
  }, [value]);

  const commit = () => {
    if (local.trim() === '') {
      onCommit(null);
      return;
    }
    const parsed = parseInt(local, 10);
    if (isNaN(parsed) || parsed <= 0) {
      onCommit(null);
      setLocal('');
    } else {
      onCommit(parsed);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="number"
      placeholder="0"
      className="w-16 bg-zinc-950 border border-[#27272a] text-zinc-300 rounded px-2 py-0.5 text-xs text-right focus:outline-none focus:border-indigo-500 font-mono"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}
